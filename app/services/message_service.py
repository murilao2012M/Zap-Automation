from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.schemas.domain import AIInsight, Contact, Conversation, Message
from app.schemas.messaging import MessageProcessResult, WhatsAppWebhookPayload
from app.services.ai_service import AIService
from app.services.automation_service import AutomationService
from app.services.meta_whatsapp_service import MetaWhatsAppService
from app.services.plan_service import PlanService
from app.services.twilio_whatsapp_service import TwilioWhatsAppService
from app.utils.serialization import sanitize_mongo_document

logger = logging.getLogger("zap_automation")


class MessageService:
    def __init__(self, db):
        self.db = db
        self.ai_service = AIService()
        self.automation_service = AutomationService(db)
        self.meta_service = MetaWhatsAppService()
        self.plan_service = PlanService(db)
        self.twilio_service = TwilioWhatsAppService()

    async def _record_operation_event(
        self,
        *,
        tenant_id: str,
        level: str,
        category: str,
        title: str,
        detail: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.db.operation_events.insert_one(
            {
                "tenant_id": tenant_id,
                "level": level,
                "category": category,
                "title": title,
                "detail": detail,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc),
            }
        )

    async def _get_tenant(self, tenant_id: str) -> dict:
        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"id": tenant_id}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant nao encontrado")
        return tenant

    async def _get_or_create_contact(self, payload: WhatsAppWebhookPayload) -> Contact:
        document = sanitize_mongo_document(await self.db.contacts.find_one({"tenant_id": payload.tenant_id, "phone": payload.phone}))
        if document:
            return Contact(**document)

        contact = Contact(tenant_id=payload.tenant_id, name=payload.contact_name, phone=payload.phone)
        await self.db.contacts.insert_one(contact.model_dump())
        return contact

    async def _get_or_create_conversation(self, tenant_id: str, contact_id: str) -> Conversation:
        document = sanitize_mongo_document(
            await self.db.conversations.find_one(
                {"tenant_id": tenant_id, "contact_id": contact_id, "status": {"$in": ["bot", "human"]}}
            )
        )
        if document:
            return Conversation(**document)

        conversation = Conversation(
            tenant_id=tenant_id,
            contact_id=contact_id,
            status="bot",
            last_message_at=datetime.now(timezone.utc).isoformat(),
        )
        await self.db.conversations.insert_one(conversation.model_dump())
        return conversation

    async def _get_recent_messages(self, conversation_id: str) -> list[dict]:
        documents = await self.db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1).to_list(length=6)
        return [sanitize_mongo_document(document) for document in documents]

    async def _insert_message(
        self,
        *,
        tenant_id: str,
        conversation_id: str,
        contact_id: str,
        direction: str,
        content: str,
        intent: str | None = None,
        message_type: str = "text",
        metadata: dict[str, Any] | None = None,
    ) -> Message:
        message = Message(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            contact_id=contact_id,
            direction=direction,
            content=content,
            intent=intent,
            message_type=message_type,
            metadata=metadata or {},
        )
        await self.db.messages.insert_one(message.model_dump())
        return message

    async def _has_processed_provider_message(
        self,
        *,
        tenant_id: str,
        provider: str,
        provider_message_id: str | None,
    ) -> bool:
        if not provider_message_id:
            return False

        metadata_key = (
            "metadata.meta_message_id"
            if provider == "meta"
            else "metadata.twilio_message_sid"
            if provider == "twilio"
            else None
        )
        if not metadata_key:
            return False

        existing = await self.db.messages.find_one(
            {
                "tenant_id": tenant_id,
                metadata_key: provider_message_id,
            }
        )
        return existing is not None

    async def _dispatch_provider_message(
        self,
        *,
        tenant: dict,
        contact: Contact,
        content: str,
        message_type: str,
        template_name: str | None = None,
        body_parameters: list[str] | None = None,
    ) -> dict[str, Any] | None:
        access_token = tenant.get("meta_access_token")
        phone_number_id = tenant.get("meta_phone_number_id")

        try:
            if tenant.get("channel_provider") == "twilio":
                account_sid = tenant.get("twilio_account_sid")
                auth_token = tenant.get("twilio_auth_token")
                from_number = tenant.get("twilio_whatsapp_number")
                if not account_sid or not auth_token or not from_number:
                    return None
                return await self.twilio_service.send_text_message(
                    account_sid=account_sid,
                    auth_token=auth_token,
                    from_number=from_number,
                    to_number=contact.phone,
                    body=content,
                )

            if not access_token or not phone_number_id:
                return None

            if message_type == "template" and template_name:
                return await self.meta_service.send_template_message(
                    access_token=access_token,
                    phone_number_id=phone_number_id,
                    to=contact.phone,
                    template_name=template_name,
                    body_parameters=body_parameters,
                )

            return await self.meta_service.send_text_message(
                access_token=access_token,
                phone_number_id=phone_number_id,
                to=contact.phone,
                body=content,
            )
        except httpx.HTTPError as exc:
            await self._record_operation_event(
                tenant_id=tenant["id"],
                level="error",
                category="provider_delivery",
                title="Falha ao enviar mensagem",
                detail=str(exc),
                metadata={
                    "provider": tenant.get("channel_provider", "simulation"),
                    "contact_phone": contact.phone,
                    "message_type": message_type,
                },
            )
            logger.exception(
                "provider_message_failed tenant_id=%s provider=%s to=%s",
                tenant["id"],
                tenant.get("channel_provider", "simulation"),
                contact.phone,
            )
            return {"error": str(exc)}

    async def _save_and_dispatch_outgoing(
        self,
        *,
        tenant: dict,
        conversation: Conversation,
        contact: Contact,
        content: str,
        intent: str | None,
        message_type: str = "text",
        metadata: dict[str, Any] | None = None,
        template_name: str | None = None,
        body_parameters: list[str] | None = None,
    ) -> Message:
        provider_result = await self._dispatch_provider_message(
            tenant=tenant,
            contact=contact,
            content=content,
            message_type=message_type,
            template_name=template_name,
            body_parameters=body_parameters,
        )
        final_metadata = {
            **(metadata or {}),
            "provider": (
                "twilio"
                if tenant.get("channel_provider") == "twilio" and tenant.get("twilio_account_sid")
                else "meta"
                if tenant.get("channel_provider") == "meta" and tenant.get("meta_phone_number_id") and tenant.get("meta_access_token")
                else "internal_simulation"
            ),
            "provider_result": provider_result,
        }
        return await self._insert_message(
            tenant_id=tenant["id"],
            conversation_id=conversation.id,
            contact_id=contact.id,
            direction="outgoing",
            content=content,
            intent=intent,
            message_type=message_type,
            metadata=final_metadata,
        )

    async def process_incoming_message(self, payload: WhatsAppWebhookPayload) -> MessageProcessResult:
        logger.info(
            "incoming_message_received tenant_id=%s phone=%s",
            payload.tenant_id,
            payload.phone,
        )
        tenant = await self._get_tenant(payload.tenant_id)
        await self.automation_service.ensure_default_rules(payload.tenant_id)

        contact = await self._get_or_create_contact(payload)
        conversation = await self._get_or_create_conversation(payload.tenant_id, contact.id)
        recent_messages = await self._get_recent_messages(conversation.id)
        context_summary = self.automation_service.build_context_summary(recent_messages)

        intent, confidence = self.ai_service.classify_intent(payload.message)
        menu_intent = self.automation_service.map_menu_selection(payload.message)
        detected_intent = menu_intent or intent
        sentiment = self.ai_service.detect_sentiment(payload.message)
        rules = await self.automation_service.get_rules(payload.tenant_id)
        matched_rule = self.automation_service.find_matching_rule(payload.message, rules, detected_intent)
        flow = await self.automation_service.get_flow_for_intent(payload.tenant_id, detected_intent)

        incoming = await self._insert_message(
            tenant_id=payload.tenant_id,
            conversation_id=conversation.id,
            contact_id=contact.id,
            direction="incoming",
            content=payload.message,
            intent=detected_intent,
            metadata=payload.metadata,
        )

        if not tenant.get("bot_enabled", True):
            response_text, requires_human, routing_reason = self.automation_service.build_disabled_response()
            automation_triggered = False
            matched_rule_name = None
        elif conversation.status == "human":
            response_text = tenant.get("handoff_message", "Seu atendimento foi encaminhado para um atendente humano.")
            requires_human = True
            routing_reason = "conversation_already_in_human_handoff"
            automation_triggered = False
            matched_rule_name = None
        elif not self.automation_service.is_within_business_hours(tenant):
            response_text, requires_human, routing_reason = self.automation_service.build_after_hours_response(tenant)
            automation_triggered = False
            matched_rule_name = None
        elif matched_rule:
            response_text = self.automation_service.render_text(matched_rule["response_template"], tenant)
            requires_human = bool(matched_rule.get("requires_human", False))
            routing_reason = f"matched_{matched_rule.get('trigger_type', 'keyword')}_rule"
            automation_triggered = True
            matched_rule_name = matched_rule["name"]
        else:
            response_text, requires_human, routing_reason = self.automation_service.build_intent_response(
                detected_intent,
                tenant,
                sentiment,
                context_summary,
                flow=flow,
            )
            automation_triggered = bool(flow)
            matched_rule_name = flow["name"] if flow else None

        outgoing = await self._save_and_dispatch_outgoing(
            tenant=tenant,
            conversation=conversation,
            contact=contact,
            content=response_text,
            intent=detected_intent,
            metadata={
                "generated_by": "automation_engine",
                "confidence": confidence,
                "matched_rule": matched_rule_name,
                "routing_reason": routing_reason,
            },
        )

        conversation_status = "human" if requires_human else "bot"
        now = datetime.now(timezone.utc)
        await self.db.contacts.update_one(
            {"id": contact.id},
            {
                "$set": {
                    "last_intent": detected_intent,
                    "updated_at": now,
                }
            },
        )
        await self.db.conversations.update_one(
            {"id": conversation.id},
            {
                "$set": {
                    "sentiment": sentiment,
                    "status": conversation_status,
                    "current_intent": detected_intent,
                    "handoff_reason": routing_reason if requires_human else None,
                    "last_bot_action": matched_rule_name or routing_reason,
                    "last_message_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )

        insight = AIInsight(
            tenant_id=payload.tenant_id,
            conversation_id=conversation.id,
            intent=detected_intent,
            sentiment=sentiment,
            suggested_reply=response_text,
            confidence=confidence,
        )
        await self.db.ai_insights.insert_one(insight.model_dump())

        logger.info(
            "incoming_message_processed tenant_id=%s conversation_id=%s intent=%s routed=%s handoff=%s",
            payload.tenant_id,
            conversation.id,
            detected_intent,
            routing_reason,
            requires_human,
        )

        return MessageProcessResult(
            tenant_id=payload.tenant_id,
            conversation_id=conversation.id,
            contact_id=contact.id,
            incoming_message_id=incoming.id,
            detected_intent=detected_intent,
            confidence=confidence,
            sentiment=sentiment,
            automation_triggered=automation_triggered,
            response=response_text,
            handoff_to_human=requires_human,
            matched_rule=matched_rule_name,
            routing_reason=routing_reason,
        )

    async def send_manual_reply(
        self,
        *,
        tenant_id: str,
        conversation_id: str,
        content: str,
        current_user: dict,
        message_type: str = "text",
    ) -> dict:
        tenant = await self._get_tenant(tenant_id)
        conversation_data = sanitize_mongo_document(await self.db.conversations.find_one({"tenant_id": tenant_id, "id": conversation_id}))
        if not conversation_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa nao encontrada.")
        conversation = Conversation(**conversation_data)

        contact_data = sanitize_mongo_document(await self.db.contacts.find_one({"id": conversation.contact_id}))
        if not contact_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contato nao encontrado.")
        contact = Contact(**contact_data)

        await self._save_and_dispatch_outgoing(
            tenant=tenant,
            conversation=conversation,
            contact=contact,
            content=content,
            intent=conversation.current_intent,
            message_type=message_type,
            metadata={
                "generated_by": "human_dashboard",
                "agent_id": current_user.get("id"),
                "agent_name": current_user.get("name"),
            },
        )

        now = datetime.now(timezone.utc)
        await self.db.conversations.update_one(
            {"tenant_id": tenant_id, "id": conversation_id},
            {
                "$set": {
                    "status": "human",
                    "handoff_reason": "manual_reply_from_dashboard",
                    "last_bot_action": "human_reply",
                    "last_message_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )
        return sanitize_mongo_document(await self.db.conversations.find_one({"tenant_id": tenant_id, "id": conversation_id})) or {}

    async def process_meta_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        processed_results: list[dict[str, Any]] = []
        status_updates: list[dict[str, Any]] = []

        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                metadata = value.get("metadata", {})
                phone_number_id = metadata.get("phone_number_id")
                tenant = sanitize_mongo_document(await self.db.tenants.find_one({"meta_phone_number_id": phone_number_id}))
                if not tenant:
                    continue

                contacts_index = {contact.get("wa_id"): contact.get("profile", {}).get("name") for contact in value.get("contacts", [])}
                for message in value.get("messages", []):
                    message_type = message.get("type", "text")
                    provider_message_id = message.get("id")
                    if await self._has_processed_provider_message(
                        tenant_id=tenant["id"],
                        provider="meta",
                        provider_message_id=provider_message_id,
                    ):
                        await self._record_operation_event(
                            tenant_id=tenant["id"],
                            level="warning",
                            category="duplicate_message",
                            title="Evento Meta duplicado ignorado",
                            detail="Uma mensagem recebida pela Meta já havia sido processada anteriormente.",
                            metadata={"meta_message_id": provider_message_id},
                        )
                        logger.warning(
                            "duplicate_meta_message_ignored tenant_id=%s meta_message_id=%s",
                            tenant["id"],
                            provider_message_id,
                        )
                        continue
                    if message_type == "text":
                        body = message.get("text", {}).get("body", "")
                    else:
                        body = message.get(message_type, {}).get("caption") or f"[{message_type}]"

                    inbound = WhatsAppWebhookPayload(
                        tenant_id=tenant["id"],
                        phone=message.get("from", ""),
                        contact_name=contacts_index.get(message.get("from")),
                        message=body,
                        metadata={
                            "provider": "meta",
                            "meta_message_id": provider_message_id,
                            "meta_type": message_type,
                            "phone_number_id": phone_number_id,
                        },
                    )
                    result = await self.process_incoming_message(inbound)
                    processed_results.append(result.model_dump())

                for status_event in value.get("statuses", []):
                    status_updates.append(status_event)

        return {
            "processed_messages": len(processed_results),
            "processed_status_updates": len(status_updates),
            "results": processed_results,
        }

    async def process_twilio_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        from_value = str(payload.get("From", ""))
        from_number = from_value.replace("whatsapp:", "").strip()
        to_value = str(payload.get("To", ""))
        to_number = to_value.replace("whatsapp:", "").strip()
        body = str(payload.get("Body", ""))
        contact_name = payload.get("ProfileName") or payload.get("WaId") or "Contato Twilio"

        tenant = sanitize_mongo_document(await self.db.tenants.find_one({"twilio_whatsapp_number": to_number}))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant Twilio nao encontrado")

        twilio_message_sid = payload.get("MessageSid")
        if await self._has_processed_provider_message(
            tenant_id=tenant["id"],
            provider="twilio",
            provider_message_id=str(twilio_message_sid) if twilio_message_sid else None,
        ):
            await self._record_operation_event(
                tenant_id=tenant["id"],
                level="warning",
                category="duplicate_message",
                title="Evento Twilio duplicado ignorado",
                detail="Uma mensagem recebida pela Twilio já havia sido processada anteriormente.",
                metadata={"twilio_message_sid": twilio_message_sid},
            )
            logger.warning(
                "duplicate_twilio_message_ignored tenant_id=%s twilio_message_sid=%s",
                tenant["id"],
                twilio_message_sid,
            )
            return {
                "processed_messages": 0,
                "processed_status_updates": 0,
                "results": [],
                "duplicate_ignored": True,
            }

        inbound = WhatsAppWebhookPayload(
            tenant_id=tenant["id"],
            phone=from_number,
            contact_name=contact_name,
            message=body,
            metadata={
                "provider": "twilio",
                "twilio_message_sid": twilio_message_sid,
                "wa_id": payload.get("WaId"),
            },
        )
        result = await self.process_incoming_message(inbound)
        return {
            "processed_messages": 1,
            "processed_status_updates": 0,
            "results": [result.model_dump()],
        }
