import Foundation

struct ParseListRequest: Codable {
    let raw_text: String
}

struct ShoppingItemSchema: Codable, Identifiable {
    var id: String { item_id }
    let item_id: String
    let name: String
    let quantity: String?
    let unit: String?
    let brand_lock: Bool
    let brand: String?
}

struct ShoppingListResponse: Codable {
    let list_id: String
    let items: [ShoppingItemSchema]
    let needs_clarification: Bool
}

struct WinnerItem: Codable, Identifiable {
    var id: String { item_id }
    let item_id: String
    let name: String
    let platform: String
    let price: Double
    let rating: Double?
    let confidence: Double
}

struct OptimizationInputItem: Codable, Identifiable {
    var id: String { requested_item.item_id }
    let requested_item: ShoppingItemSchema
    // worker_results omitted here since we just need the requested_item for the UI
}

struct OptimizationResult: Codable {
    let winners: [WinnerItem]
    let needs_review: [OptimizationInputItem]
    let platform_totals: [String: Double]
    let total_cost: Double
    let split_cart_used: Bool
    let savings: Double
}

struct ProgressUpdate: Codable {
    let list_id: String
    let percent_complete: Int
    let completed_items: Int
    let total_items: Int
    let platforms_done: [String]
}
