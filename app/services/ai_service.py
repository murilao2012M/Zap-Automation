from __future__ import annotations

from functools import lru_cache

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
except ImportError:  # pragma: no cover - fallback for local runtimes without scientific wheels
    TfidfVectorizer = None
    LogisticRegression = None
    Pipeline = None


TRAINING_SAMPLES = [
    ("quero comprar um produto", "compra"),
    ("preciso de um orcamento", "compra"),
    ("quero agendar uma visita", "agendamento"),
    ("agende meu atendimento", "agendamento"),
    ("estou com problema no pedido", "suporte"),
    ("preciso de suporte tecnico", "suporte"),
    ("nao reconheco essa cobranca", "financeiro"),
    ("quero segunda via do boleto", "financeiro"),
    ("quero reclamar do atendimento", "reclamacao"),
    ("o servico foi ruim", "reclamacao"),
]


POSITIVE_WORDS = {"obrigado", "excelente", "otimo", "bom", "perfeito", "gostei"}
NEGATIVE_WORDS = {"ruim", "pessimo", "reclamar", "problema", "erro", "cancelar"}


class AIService:
    def __init__(self, has_llm: bool = False):
        self.has_llm = has_llm
        self.classifier = self._build_classifier() if Pipeline is not None else None

    @staticmethod
    @lru_cache
    def _build_classifier() -> Pipeline:
        texts = [sample[0] for sample in TRAINING_SAMPLES]
        labels = [sample[1] for sample in TRAINING_SAMPLES]
        pipeline = Pipeline(
            [
                ("vectorizer", TfidfVectorizer(ngram_range=(1, 2))),
                ("classifier", LogisticRegression(max_iter=300)),
            ]
        )
        pipeline.fit(texts, labels)
        return pipeline

    def classify_intent(self, message: str) -> tuple[str, float]:
        if self.classifier is None:
            return self._classify_intent_fallback(message)
        probabilities = self.classifier.predict_proba([message])[0]
        labels = self.classifier.classes_
        best_index = int(probabilities.argmax())
        return labels[best_index], float(probabilities[best_index])

    def _classify_intent_fallback(self, message: str) -> tuple[str, float]:
        lowered = message.lower()
        keyword_map = {
            "compra": ["comprar", "orcamento", "preco", "valor", "produto"],
            "agendamento": ["agendar", "horario", "marcar", "visita"],
            "suporte": ["suporte", "problema", "erro", "ajuda", "pedido"],
            "financeiro": ["boleto", "cobranca", "pagamento", "financeiro", "segunda via"],
            "reclamacao": ["reclamacao", "reclamar", "ruim", "cancelar", "insatisfeito"],
        }
        for intent, keywords in keyword_map.items():
            if any(keyword in lowered for keyword in keywords):
                return intent, 0.72
        return "suporte", 0.55

    def detect_sentiment(self, message: str) -> str:
        lowered = message.lower()
        positive_hits = sum(word in lowered for word in POSITIVE_WORDS)
        negative_hits = sum(word in lowered for word in NEGATIVE_WORDS)
        if negative_hits > positive_hits:
            return "negative"
        if positive_hits > negative_hits:
            return "positive"
        return "neutral"

    def suggest_reply(self, intent: str, tenant_name: str, sentiment: str) -> str:
        base = {
            "compra": f"Olá! Sou o assistente da {tenant_name}. Posso ajudar com opções, preços e próximos passos para sua compra.",
            "suporte": f"Entendi. Vou ajudar com seu suporte na {tenant_name}. Pode me enviar mais detalhes do problema?",
            "financeiro": f"Posso apoiar com questões financeiras da {tenant_name}, como boleto, cobrança ou confirmação de pagamento.",
            "agendamento": f"Vamos agendar seu atendimento com a {tenant_name}. Qual o melhor dia e horário para você?",
            "reclamacao": f"Sinto muito pela experiência. Vou registrar sua reclamação e priorizar uma solução com a equipe da {tenant_name}.",
        }.get(intent, f"Olá! Sou o assistente virtual da {tenant_name}. Como posso ajudar você hoje?")

        if sentiment == "negative":
            return f"{base} Se preferir, posso encaminhar para um atendente humano agora."
        return base
