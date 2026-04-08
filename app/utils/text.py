def slugify(value: str) -> str:
    lowered = value.strip().lower()
    cleaned = "".join(char if char.isalnum() else "-" for char in lowered)
    parts = [part for part in cleaned.split("-") if part]
    return "-".join(parts)
