import Foundation

struct PlatformSelectorConfig {
    let platformName: String
    let searchUrlTemplate: String
    let addBtnSelector: String
    let cartCountSelector: String
}

enum PlatformSelectors {
    static let zepto = PlatformSelectorConfig(
        platformName: "zepto",
        searchUrlTemplate: "https://www.zeptonow.com/search?q=%@",
        addBtnSelector: "button[data-testid='add-btn']",
        cartCountSelector: "span[data-testid='cart-count']"
    )
    
    static let blinkit = PlatformSelectorConfig(
        platformName: "blinkit",
        searchUrlTemplate: "https://blinkit.com/s/?q=%@",
        addBtnSelector: ".Product__Container button.add-to-cart",
        cartCountSelector: ".cart-count-badge"
    )
    
    static let instamart = PlatformSelectorConfig(
        platformName: "instamart",
        searchUrlTemplate: "https://www.swiggy.com/instamart/search?customQuery=%@",
        addBtnSelector: ".SearchResult_item button",
        cartCountSelector: ".cart-indicator"
    )
    
    static func config(for platform: String) -> PlatformSelectorConfig? {
        switch platform.lowercased() {
        case "zepto": return zepto
        case "blinkit": return blinkit
        case "instamart": return instamart
        default: return nil
        }
    }
}
