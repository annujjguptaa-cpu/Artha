# Deterministic price/rating logic

def optimize_results(results: list):
    """
    Sorts results by price, optimizing for the lowest cost.
    """
    return sorted(results, key=lambda x: x.get('price', 0))
