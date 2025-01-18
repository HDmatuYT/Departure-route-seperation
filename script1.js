async function fetchBazaarPrices() {
    try {
        const response = await fetch('https://api.hypixel.net/skyblock/bazaar');
        const data = await response.json();

        if (!data.success) {
            throw new Error('Bazaar API unavailable, please try again later.');
        }

        const enchantedEnderPearl = data.products['ENCHANTED_ENDER_PEARL'].quick_status.sellPrice;
        const blazeRod = data.products['BLAZE_ROD'].quick_status.sellPrice;
        const enchantedEyeofEnder = data.products['ENCHANTED_EYE_OF_ENDER'].quick_status.sellPrice;

        return {
            enchantedEnderPearl,
            blazeRod,
            enchantedEyeofEnder,
        };
    } catch (error) {
        console.error('Error fetching Bazaar prices:', error);
        return null;
    }
}

async function initializePrices() {
    const bazaarPrices = await fetchBazaarPrices();
    if (!bazaarPrices) {
        document.getElementById("priceDisplay").innerHTML = `
            <p style="color: red;">Failed to load material prices. Please try again later.</p>
        `;
        return;
    }

    const { enchantedEnderPearl, blazeRod, enchantedEyeofEnder } = bazaarPrices;
    displayPrices({ enchantedEnderPearl, blazeRod, enchantedEyeofEnder });
}

async function calculateMaterials() {
    const coinsAvailable = parseFloat(document.getElementById("coinsAvailable").value.replace(/,/g, ''));

    if (coinsAvailable < 1 || isNaN(coinsAvailable)) {
        alert("Please enter a valid number for coins.");
        return;
    }

    const bazaarPrices = await fetchBazaarPrices();
    if (!bazaarPrices) {
        alert("Failed to fetch Bazaar prices. Please try again later.");
        return;
    }

    const { enchantedEnderPearl, blazeRod, enchantedEyeofEnder } = bazaarPrices;

    const enchantedEnderPearlsPerEye = 16;
    const blazeRodsPerEye = 32;

    const craftingCostPerEye = enchantedEnderPearlsPerEye * enchantedEnderPearl + blazeRodsPerEye * blazeRod;

    const maxCraftable = Math.floor(coinsAvailable / Math.min(craftingCostPerEye, enchantedEyeofEnder));
    const totalEnchantedEnderPearls = enchantedEnderPearlsPerEye * maxCraftable;
    const totalBlazeRods = blazeRodsPerEye * maxCraftable;

    const totalCostEnchantedEnderPearls = totalEnchantedEnderPearls * enchantedEnderPearl;
    const totalCostBlazeRods = totalBlazeRods * blazeRod;
    const craftingCost = totalCostEnchantedEnderPearls + totalCostBlazeRods;

    const directCost = enchantedEyeofEnder * maxCraftable;
    const totalCost = Math.min(craftingCost, directCost);

    const income = enchantedEyeofEnder * maxCraftable;
    const profit = income - totalCost;

    displayResults({
        maxCraftable,
        totalEnchantedEnderPearls,
        totalBlazeRods,
        craftingCost,
        directCost,
        totalCost,
        income,
        profit,
        enchantedEnderPearl,
        blazeRod,
    });
}

function displayPrices({ enchantedEnderPearl, blazeRod, enchantedEyeofEnder }) {
    document.getElementById("priceDisplay").innerHTML = `
        <h3>Material Prices</h3>
        <ul>
            <li>Enchanted Ender Pearl: ${enchantedEnderPearl.toLocaleString()} coins each</li>
            <li>Blaze Rod: ${blazeRod.toLocaleString()} coins each</li>
            <li>Enchanted Eye of Ender: ${enchantedEyeofEnder.toLocaleString()} coins each</li>
        </ul>
    `;
}

function displayResults({
    maxCraftable,
    totalEnchantedEnderPearls,
    totalBlazeRods,
    craftingCost,
    directCost,
    totalCost,
    income,
    profit,
    enchantedEnderPearl,
    blazeRod,
}) {
    document.getElementById("result").innerHTML = `
        <p><strong>Total Craftable Enchanted Eyes of Ender:</strong> ${maxCraftable}</p>
        <p><strong>Total Enchanted Ender Pearls:</strong> ${totalEnchantedEnderPearls} (${enchantedEnderPearl.toLocaleString()} coins each)</p>
        <p><strong>Total Blaze Rods:</strong> ${totalBlazeRods} (${blazeRod.toLocaleString()} coins each)</p>
        <p><strong>Cost (Crafting Method):</strong> ${craftingCost.toLocaleString()} coins</p>
        <p><strong>Cost (Direct Purchase):</strong> ${directCost.toLocaleString()} coins</p>
        <p><strong>Total Cost:</strong> ${totalCost.toLocaleString()} coins (${craftingCost < directCost ? 'Crafted' : 'Purchased'})</p>
        <p><strong>Income (Selling Price, the money you have in total after selling the goods):</strong> ${income.toLocaleString()} coins</p>
        <p><strong>Profit/Loss:</strong> 
            <span style="color: ${profit >= 0 ? 'green' : 'red'};">${profit.toLocaleString()} coins</span>
        </p>
    `;
}

// Initialize prices when the page loads
window.onload = initializePrices;
