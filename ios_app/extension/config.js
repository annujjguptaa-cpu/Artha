// Centralized Platform Selectors Configuration for Artha Extension

const PLATFORM_CONFIGS = {
  zepto: {
    name: 'Zepto',
    domain: 'zeptonow.com',
    searchUrlTemplate: 'https://www.zeptonow.com/search?q={query}',
    selectors: {
      searchInput: "input[type='search'], input[placeholder*='Search']",
      productCard: "[data-testid='product-card'], .product-card",
      addBtn: "button[data-testid='add-btn'], button:has-text('ADD'), button.add-btn",
      cartCount: "span[data-testid='cart-count'], .cart-count, [data-testid='cart-btn']",
      loggedInIndicator: "[data-testid='user-profile'], .user-address, .profile-icon, [data-testid='location-bar']",
    },
  },
  blinkit: {
    name: 'Blinkit',
    domain: 'blinkit.com',
    searchUrlTemplate: 'https://blinkit.com/s/?q={query}',
    selectors: {
      searchInput: "input[placeholder*='Search']",
      productCard: ".Product__Container, [data-test-id='product-card'], .product-item",
      addBtn: ".Product__Container button.add-to-cart, button:contains('ADD'), div.add-to-cart",
      cartCount: ".cart-count-badge, .cart-item-count, .cart-badge",
      loggedInIndicator: ".user-profile, .location-text, .my-account, .delivery-location",
    },
  },
  instamart: {
    name: 'Swiggy Instamart',
    domain: 'swiggy.com',
    searchUrlTemplate: 'https://www.swiggy.com/instamart/search?customQuery={query}',
    selectors: {
      searchInput: "input[placeholder*='Search']",
      productCard: ".SearchResult_item, [data-testid='instamart-item'], .item-card",
      addBtn: ".SearchResult_item button, button._1R19g, button._3L1yw",
      cartCount: ".cart-indicator, [data-testid='cart-count'], ._2vP4-",
      loggedInIndicator: "._1tcx6, .location-wrapper, ._3m5q_, .user-icon",
    },
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PLATFORM_CONFIGS };
}
