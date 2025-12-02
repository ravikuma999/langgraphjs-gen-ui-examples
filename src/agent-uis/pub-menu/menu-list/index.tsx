import "./index.css";
import { useState } from "react";

interface MenuItem {
  MenuItemID?: number;
  MenuItemName?: string;
  MenuItemDescription?: string;
  MenuItemPrice?: number;
  MenuItemImage?: string;
  [key: string]: any;
}

interface MenuCategory {
  MenuItemCategoryID?: number;
  MenuItemCategoryName?: string;
  MenuItems?: MenuItem[];
  [key: string]: any;
}

interface MenuData {
  d?: {
    MenuItemCategories?: MenuCategory[];
    [key: string]: any;
  };
  MenuItemCategories?: MenuCategory[];
  [key: string]: any;
}

export default function MenuList({
  toolCallId,
  menuData,
}: {
  toolCallId: string;
  menuData: MenuData;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemToOrder, setItemToOrder] = useState<MenuItem | null>(null);

  // Handle different API response structures
  const extractCategories = (data: MenuData): MenuCategory[] => {
    if (data?.d?.MenuItemCategories) {
      return data.d.MenuItemCategories;
    }
    if (data?.MenuItemCategories) {
      return data.MenuItemCategories;
    }
    // If data is an array, return it directly
    if (Array.isArray(data)) {
      return data as MenuCategory[];
    }
    return [];
  };

  const categories = extractCategories(menuData);

  const filteredItems = selectedCategory
    ? categories
        .find((cat) => cat.MenuItemCategoryName === selectedCategory)
        ?.MenuItems || []
    : [];

  const allItems = categories.flatMap((cat) => cat.MenuItems || []);

  if (selectedItem) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-amber-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-xl font-bold">Menu Item Details</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-white bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {selectedItem.MenuItemImage && (
              <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src={selectedItem.MenuItemImage}
                  alt={selectedItem.MenuItemName || "Menu item"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedItem.MenuItemName || "Unnamed Item"}
              </h3>
              {selectedItem.MenuItemPrice !== undefined && (
                <p className="text-2xl font-semibold text-amber-600 mb-4">
                  ${selectedItem.MenuItemPrice.toFixed(2)}
                </p>
              )}
              {selectedItem.MenuItemDescription && (
                <p className="text-gray-600 leading-relaxed">
                  {selectedItem.MenuItemDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-amber-600 px-6 py-4">
        <h2 className="text-white text-xl font-bold">Pub Menu</h2>
        <p className="text-amber-100 text-sm mt-1">
          Browse our delicious food and drinks
        </p>
      </div>

      <div className="p-6">
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No menu categories found. Displaying raw data:
            </p>
            <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(menuData, null, 2)}
            </pre>
          </div>
        ) : (
          <>
            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category.MenuItemCategoryID || category.MenuItemCategoryName}
                    onClick={() => setSelectedCategory(category.MenuItemCategoryName || null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.MenuItemCategoryName
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.MenuItemCategoryName || "Unnamed Category"}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedCategory
                  ? `Showing ${filteredItems.length} items in "${selectedCategory}"`
                  : `Showing ${allItems.length} items across ${categories.length} categories`}
              </p>
            </div>

            {/* Menu Items Horizontal Scroll */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {(selectedCategory ? filteredItems : allItems).map((item, index) => (
                  <div
                    key={item.MenuItemID || index}
                    onClick={() => setItemToOrder(item)}
                    className="border rounded-lg p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all flex-shrink-0 w-64"
                  >
                    {item.MenuItemImage && (
                      <div className="w-full h-32 bg-gray-200 rounded-md mb-3 overflow-hidden">
                        <img
                          src={item.MenuItemImage}
                          alt={item.MenuItemName || "Menu item"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {item.MenuItemName || "Unnamed Item"}
                    </h4>
                    {item.MenuItemPrice !== undefined && (
                      <p className="text-amber-600 font-semibold">
                        ${item.MenuItemPrice.toFixed(2)}
                      </p>
                    )}
                    {item.MenuItemDescription && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {item.MenuItemDescription}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {allItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No menu items found.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {itemToOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Order
              </h3>
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">{itemToOrder.MenuItemName || "This item"}</span>
                  {itemToOrder.MenuItemPrice !== undefined && (
                    <span className="text-amber-600 ml-2">
                      - ${itemToOrder.MenuItemPrice.toFixed(2)}
                    </span>
                  )}
                </p>
                <p className="text-gray-600">
                  Do you want me to order this for you?
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setItemToOrder(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle order confirmation here
                    setItemToOrder(null);
                    // You can add order logic here
                    alert(`Order confirmed for ${itemToOrder.MenuItemName}!`);
                  }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Yes, Order It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


