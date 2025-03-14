export function getDataFromExcel(data:any[][]) {
    const headers:any = data[2];
    
    if (headers[0] !== "Phone") {
        // throw new Error("Headers do not match expected value.");
        return null;
    }
    
    // Convert sheet data to column arrays
    const rows = data.slice(3);
    const geometry = rows.map((row:any) => {
        return {
            index: row[0],
            x: row[1],
            y: row[2],
            z: row[3],
        };
    });
    return geometry;
}