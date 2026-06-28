/**
 * Sanitizes data arrays for Recharts to prevent DecimalError (NaN/Infinity).
 * 
 * @param {Array} data - The array of objects to plot.
 * @returns {Array} - A new array with all number values ensuring finiteness.
 */
export const sanitizeChartData = (data) => {
    if (!Array.isArray(data)) return [];

    return data.map(item => {
        // Shallow copy the item
        const newItem = { ...item };

        Object.keys(newItem).forEach(key => {
            const val = newItem[key];

            // Check if the value is a number type
            if (typeof val === 'number') {
                // If it's NaN or Infinity, force it to 0
                if (!Number.isFinite(val)) {
                    console.warn(`[ChartSanitizer] Found invalid number for key "${key}":`, val);
                    newItem[key] = 0;
                }
            }
        });

        return newItem;
    });
};
