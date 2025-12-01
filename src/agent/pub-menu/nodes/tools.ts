import { PubMenuState, PubMenuUpdate } from "../types";
import { ChatOpenAI } from "@langchain/openai";
import { typedUi } from "@langchain/langgraph-sdk/react-ui/server";
import type ComponentMap from "../../../agent-uis/index";
import { z } from "zod";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { findToolCall } from "../../find-tool-call";

const getMenuSchema = z
  .object({})
  .describe("A tool to get the restaurant menu items from the API");

const MENU_TOOLS = [
  {
    name: "get-menu",
    description:
      "A tool to retrieve the restaurant menu items. Use this when the user asks about menu items, food, drinks, dishes, or anything related to what's available at the pub.",
    schema: getMenuSchema,
  },
];

// Transform flat array response into hierarchical structure
function transformMenuData(rawData: any): any {
  // If already in hierarchical format, return as is
  if (rawData?.MenuItemCategories && Array.isArray(rawData.MenuItemCategories)) {
    console.log("✅ Data already in hierarchical format with MenuItemCategories");
    return rawData;
  }
  if (rawData?.d?.MenuItemCategories && Array.isArray(rawData.d.MenuItemCategories)) {
    console.log("✅ Data in nested hierarchical format (d.MenuItemCategories)");
    return rawData;
  }

  // Check for other possible hierarchical structures
  // Look for any field that might contain categories
  if (typeof rawData === 'object' && !Array.isArray(rawData)) {
    // Check for fields like "1stMenuCategories", "MenuCategories", etc.
    const categoryKeys = Object.keys(rawData).filter(key => 
      key.toLowerCase().includes('categor') && Array.isArray(rawData[key])
    );
    
    if (categoryKeys.length > 0) {
      // Prefer keys that look like menu category fields
      const preferredKey = categoryKeys.find(k => 
        k.toLowerCase().includes('menu') || 
        k.toLowerCase().includes('item') ||
        /^\d+.*categor/i.test(k) // Matches "1stMenuCategories" pattern
      ) || categoryKeys[0];
      
      console.log(`✅ Found hierarchical structure with key: ${preferredKey} (from options: ${categoryKeys.join(', ')})`);
      const categories = rawData[preferredKey];
      // If categories already have MenuItems, return as-is, otherwise we need to process them
      if (categories.length > 0 && categories[0].MenuItems) {
        return { MenuItemCategories: categories };
      }
      // If it's an array of items, process them
      return transformMenuData(categories);
    }

    // Check nested structures
    for (const key of Object.keys(rawData)) {
      if (rawData[key] && typeof rawData[key] === 'object') {
        if (rawData[key].MenuItemCategories && Array.isArray(rawData[key].MenuItemCategories)) {
          console.log(`✅ Found nested MenuItemCategories in key: ${key}`);
          return { MenuItemCategories: rawData[key].MenuItemCategories };
        }
      }
    }
  }

  // If it's an array, check if it's the restaurant structure
  if (Array.isArray(rawData)) {
    console.log(`Processing array with ${rawData.length} items`);
    
    // Check if this is the restaurant structure - look for any item with RestaurantID and lstMenuVariantCategories
    const hasRestaurantStructure = rawData.some((item: any) => 
      item && 
      item.RestaurantID !== undefined && 
      item.lstMenuVariantCategories !== undefined
    );
    
    if (hasRestaurantStructure) {
      console.log("✅ Detected restaurant array structure with nested menu hierarchy");
      
      // Filter out invalid restaurants (RestaurantID: -1)
      const validRestaurants = rawData.filter((rest: any) => 
        rest && rest.RestaurantID && rest.RestaurantID !== -1
      );

      if (validRestaurants.length === 0) {
        console.log("No valid restaurants found");
        return { MenuItemCategories: [] };
      }

      console.log(`Processing ${validRestaurants.length} restaurant(s)`);
      
      // Collect all menu items from all restaurants, variants, and categories
      const categoryMap = new Map<string, any[]>();

      let totalItemsFound = 0;
      let totalCategoriesFound = 0;

      validRestaurants.forEach((restaurant: any) => {
        console.log(`Processing restaurant: ${restaurant.Restaurant || restaurant.RestaurantID}`);
        // Navigate: lstMenuVariantCategories -> lstMenuVariant -> lstMenuCategories -> lstMenus
        if (restaurant.lstMenuVariantCategories && Array.isArray(restaurant.lstMenuVariantCategories)) {
          console.log(`  Found ${restaurant.lstMenuVariantCategories.length} variant categories`);
          restaurant.lstMenuVariantCategories.forEach((variantCategory: any) => {
            if (variantCategory.lstMenuVariant && Array.isArray(variantCategory.lstMenuVariant)) {
              console.log(`    Found ${variantCategory.lstMenuVariant.length} variants`);
              variantCategory.lstMenuVariant.forEach((variant: any) => {
                if (variant.lstMenuCategories && Array.isArray(variant.lstMenuCategories)) {
                  console.log(`      Found ${variant.lstMenuCategories.length} menu categories in variant: ${variant.VariantName}`);
                  variant.lstMenuCategories.forEach((category: any) => {
                    // Skip invalid categories
                    if (!category.CategoryName || 
                        category.CategoryName === "--Select--" || 
                        category.MenuItemCategoryID === -1) {
                      return;
                    }

                    const categoryName = category.CategoryName;
                    totalCategoriesFound++;
                    
                    if (!categoryMap.has(categoryName)) {
                      categoryMap.set(categoryName, []);
                    }

                    // Process menu items in lstMenus
                    if (category.lstMenus && Array.isArray(category.lstMenus)) {
                      let itemsInCategory = 0;
                      category.lstMenus.forEach((item: any) => {
                        // Skip invalid items
                        if (!item.ItemName || 
                            item.ItemName === "--Select--" || 
                            item.MenuItemID === -1 ||
                            item.WebStatus !== "Yes") {
                          return;
                        }

                        const menuItem = {
                          MenuItemID: item.MenuItemID,
                          MenuItemName: item.ItemName,
                          MenuItemDescription: item.Description || "",
                          MenuItemPrice: parseFloat(item.Price || item.PriceString || 0),
                          MenuItemImage: item.MenuImage_PublicPath || item.ImageName || null,
                          CategoryName: category.CategoryName,
                          VariantName: variant.VariantName,
                          PropertyImage: item.PropertyImage, // Veg/Non-Veg indicator
                          ItemPropertyType: item.ItemPropertyType,
                          ...item, // Include all other properties
                        };

                        categoryMap.get(categoryName)!.push(menuItem);
                        itemsInCategory++;
                        totalItemsFound++;
                      });
                      console.log(`        Category "${categoryName}": ${itemsInCategory} valid items`);
                    } else {
                      console.log(`        Category "${categoryName}": no lstMenus array`);
                    }
                  });
                } else {
                  console.log(`      Variant ${variant.VariantName}: no lstMenuCategories`);
                }
              });
            } else {
              console.log(`    Variant category has no lstMenuVariant`);
            }
          });
        } else {
          console.log(`  Restaurant has no lstMenuVariantCategories`);
        }
      });

      console.log(`📊 Summary: ${totalCategoriesFound} categories processed, ${totalItemsFound} items found`);

      // Convert map to array format
      const categories = Array.from(categoryMap.entries()).map(([categoryName, items], index) => ({
        MenuItemCategoryID: index + 1,
        MenuItemCategoryName: categoryName,
        MenuItems: items,
      }));

      console.log(`✅ Transformed into ${categories.length} categories with ${categories.reduce((sum, cat) => sum + cat.MenuItems.length, 0)} total items`);
      console.log("Category names:", categories.map(c => c.MenuItemCategoryName));
      
      return { MenuItemCategories: categories };
    }

    // Otherwise, treat as flat array of items (legacy handling)
    console.log("Treating as flat array of items");
    
    // Log first item structure for debugging
    if (rawData.length > 0) {
      console.log("Sample item structure:", JSON.stringify(rawData[0], null, 2).substring(0, 500));
    }

    // Filter out invalid/default items - check multiple possible field names
    const validItems = rawData.filter((item: any) => {
      if (!item) return false;
      
      // Check for valid item names using multiple possible field names
      const itemName = item.ItemName || item.MenuItemName || item.Name || item.MenuItem?.Name;
      const restaurantId = item.RestaurantID || item.RestaurantId || item.Restaurant?.ID;
      
      return itemName && 
             itemName !== "-- Select Restaurant --" &&
             itemName !== "" &&
             restaurantId !== -1;
    });

    console.log(`Filtered to ${validItems.length} valid items`);

    if (validItems.length === 0) {
      console.log("No valid menu items found in response");
      // Try to see what we have
      if (rawData.length > 0) {
        console.log("First item keys:", Object.keys(rawData[0]));
      }
      return { MenuItemCategories: [] };
    }

    // Group items by category
    const categoryMap = new Map<string, any[]>();

    validItems.forEach((item: any) => {
      // Try multiple possible category field names
      const categoryName = item.CategoryName || 
                          item.MenuItemCategoryName || 
                          item.Category?.Name ||
                          item.MenuItemCategory?.Name ||
                          "Uncategorized";
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }

      // Map all possible field name variations
      const menuItem = {
        MenuItemID: item.MenuItemID || item.ItemID || item.ID || item.MenuItem?.ID,
        MenuItemName: item.ItemName || item.MenuItemName || item.Name || item.MenuItem?.Name,
        MenuItemDescription: item.Description || 
                           item.MenuItemDescription || 
                           item.ItemDescription ||
                           item.MenuItem?.Description,
        MenuItemPrice: parseFloat(item.Price || item.MenuItemPrice || item.ItemPrice || item.MenuItem?.Price || 0),
        MenuItemImage: item.Image || 
                      item.MenuItemImage || 
                      item.ItemImage || 
                      item.Logo ||
                      item.MenuItem?.Image,
        ...item, // Include all other properties
      };

      categoryMap.get(categoryName)!.push(menuItem);
    });

    // Convert map to array format
    const categories = Array.from(categoryMap.entries()).map(([categoryName, items], index) => ({
      MenuItemCategoryID: index + 1,
      MenuItemCategoryName: categoryName,
      MenuItems: items,
    }));

    console.log(`Transformed ${validItems.length} items into ${categories.length} categories`);
    console.log("Category names:", categories.map(c => c.MenuItemCategoryName));
    
    return { MenuItemCategories: categories };
  }

  // If structure is unknown object, try to extract any arrays that might be items
  if (typeof rawData === 'object' && !Array.isArray(rawData)) {
    console.log("⚠️ Unknown object structure, checking for arrays...");
    console.log("Object keys:", Object.keys(rawData));
    
    // Look for any array field that might contain menu items
    for (const key of Object.keys(rawData)) {
      if (Array.isArray(rawData[key]) && rawData[key].length > 0) {
        console.log(`Found array field '${key}' with ${rawData[key].length} items, attempting to process...`);
        // Recursively try to transform this array
        const transformed = transformMenuData(rawData[key]);
        if (transformed.MenuItemCategories && transformed.MenuItemCategories.length > 0) {
          return transformed;
        }
      }
    }
  }

  // If structure is unknown, return empty
  console.log("❌ Unknown data structure:", typeof rawData);
  console.log("Keys:", typeof rawData === 'object' && !Array.isArray(rawData) ? Object.keys(rawData) : 'N/A');
  if (Array.isArray(rawData) && rawData.length > 0) {
    console.log("Array length:", rawData.length);
    console.log("First element keys:", typeof rawData[0] === 'object' ? Object.keys(rawData[0]) : 'N/A');
  }
  return { MenuItemCategories: [] };
}

async function fetchMenuFromAPI() {
  // Build URL with query parameters (GET request works as shown in the image)
  const params = new URLSearchParams({
    paramRestaurantID: "1",
    paramUserID: "1",
    AuthenticationPassword: "dGhpbmtiZXlvbmQ=",
    needDefaultValues: "true",
    needMenuVaraintCategories: "true",
    needMenuVariants: "true",
    needMenuItemCategory: "true",
    needMenuItems: "true",
    needTagDetails: "true",
  });
  
  const apiUrl =
    `https://restaurant.menuonmobile.com/MoMRestaurantServices.asmx/GetRestaurantMenuItemsHierarchy?${params.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      const statusText = await response.text();
      console.error(`API request failed with status ${response.status}:`, statusText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    console.log("Response content-type:", contentType);
    
    // Get response text first to inspect it
    const responseText = await response.text();
    console.log("Response text length:", responseText.length);
    console.log("Response text preview:", responseText.substring(0, 500));

    // Try to parse as JSON
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
      console.log("✅ Successfully parsed JSON");
      console.log("Parsed data type:", Array.isArray(parsedData) ? "Array" : typeof parsedData);
      console.log("Parsed data keys:", typeof parsedData === 'object' && !Array.isArray(parsedData) ? Object.keys(parsedData).slice(0, 20) : 'N/A');
    } catch (jsonError) {
      // If JSON parsing fails, check if it's wrapped JSON in XML
      console.log("JSON parse failed, checking for XML wrapper...");
      
      // ASP.NET ASMX services often wrap JSON in XML with a <string> tag
      // Try to extract JSON from XML wrapper
      const jsonMatch = responseText.match(/<string[^>]*>(.*?)<\/string>/s);
      if (jsonMatch && jsonMatch[1]) {
        try {
          // Decode HTML entities if present
          let jsonText = jsonMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
          
          parsedData = JSON.parse(jsonText);
          console.log("✅ Successfully parsed JSON from XML wrapper");
        } catch (e) {
          console.error("Failed to parse JSON from XML wrapper:", e);
          throw new Error(`Failed to parse API response. Content type: ${contentType}. Response preview: ${responseText.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Failed to parse API response. Content type: ${contentType}. Response preview: ${responseText.substring(0, 200)}`);
      }
    }

    // Log structure for debugging
    if (Array.isArray(parsedData)) {
      console.log(`📦 Response is an array with ${parsedData.length} items`);
      if (parsedData.length > 0) {
        const firstItem = parsedData[0];
        console.log("First item keys:", Object.keys(firstItem));
        console.log("Has RestaurantID:", firstItem.RestaurantID !== undefined);
        console.log("Has lstMenuVariantCategories:", firstItem.lstMenuVariantCategories !== undefined);
        if (firstItem.lstMenuVariantCategories) {
          console.log("lstMenuVariantCategories length:", firstItem.lstMenuVariantCategories.length);
        }
      }
    } else if (typeof parsedData === 'object') {
      console.log("📦 Response is an object");
      console.log("Top-level keys:", Object.keys(parsedData));
      // Check for hierarchical structures
      if (parsedData['1stMenuCategories']) {
        console.log("Found '1stMenuCategories' field");
      }
      if (parsedData.MenuItemCategories) {
        console.log("Found 'MenuItemCategories' field");
      }
      // Log sample of the object structure
      console.log("Sample object structure:", JSON.stringify(Object.fromEntries(Object.entries(parsedData).slice(0, 5)), null, 2));
    }

    // Transform the data into hierarchical structure
    const transformedData = transformMenuData(parsedData);
    console.log("🎯 Final transformed data structure:", JSON.stringify({
      hasMenuItemCategories: !!transformedData.MenuItemCategories,
      categoryCount: transformedData.MenuItemCategories?.length || 0,
      totalItems: transformedData.MenuItemCategories?.reduce((sum: number, cat: any) => sum + (cat.MenuItems?.length || 0), 0) || 0
    }, null, 2));
    
    return transformedData;
  } catch (error) {
    console.error("Error fetching menu:", error);
    throw error;
  }
}

export async function callTools(
  state: PubMenuState,
  config: LangGraphRunnableConfig,
): Promise<PubMenuUpdate> {
  const ui = typedUi<typeof ComponentMap>(config);

  const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  }).bindTools(MENU_TOOLS);

  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant for a pub. When users ask about the menu, food items, drinks, dishes, or anything related to what's available to order, you should use the get-menu tool. Be friendly and conversational.",
    },
    ...state.messages,
  ]);

  const getMenuToolCall = response.tool_calls?.find(
    findToolCall("get-menu")<typeof getMenuSchema>,
  );

  if (getMenuToolCall) {
    try {
      // Fetch menu from API
      const menuData = await fetchMenuFromAPI();

      // Push UI component to display the menu
      ui.push(
        {
          name: "menu-list",
          props: {
            toolCallId: getMenuToolCall.id ?? "",
            menuData: menuData,
          },
        },
        { message: response },
      );
    } catch (error) {
      // If API call fails, return error message
      console.error("Failed to fetch menu:", error);
      const errorLlm = new ChatOpenAI({
        model: "gpt-4o",
        temperature: 0,
      });
      
      const errorResponse = await errorLlm.invoke([
        {
          role: "system",
          content:
            "You are a helpful assistant for a pub. The menu API is currently unavailable. Apologize and offer to help with other questions.",
        },
        ...state.messages,
        {
          role: "assistant",
          content: response.content,
        },
        {
          role: "human",
          content: "The menu API call failed. Please inform the user politely.",
        },
      ]);

      return {
        messages: [errorResponse],
        ui: ui.items,
        timestamp: Date.now(),
      };
    }
  }

  // If no tool call but user is asking about menu, still provide a helpful response
  return {
    messages: [response],
    ui: ui.items,
    timestamp: Date.now(),
  };
}

