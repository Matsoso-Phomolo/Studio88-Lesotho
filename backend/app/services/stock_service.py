def calculate_stock_status(quantity: int) -> str:
    if quantity <= 0:
        return "Out of Stock"
    elif quantity <= 5:
        return "Low Stock"
    return "Available"