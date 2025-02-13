export function getDataFromExcel(data:any[][]) {
    const headers:any = data[2];
    
    if (headers[0] !== "Phone") {
        // throw new Error("Headers do not match expected value.");
        return null;
    }
    
    // Get header names for x, y, z columns
    const xHeader = headers[1];
    const yHeader = headers[2];
    const zHeader = headers[3];
    
    console.log("headers:", headers, xHeader, yHeader, zHeader)
    // Convert sheet data to column arrays
    const rows = data.slice(3);
    console.log("rows", rows)
    console.log("rows[0]", rows[0][1])
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