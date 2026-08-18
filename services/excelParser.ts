
import * as XLSX from 'xlsx';
import { ExpenseEntry } from '../types';

export const parseExcelFile = async (file: File): Promise<ExpenseEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Headers are now assumed to be on the first row (index 0).
        // Removed { range: 7 } to analyze from start to end.
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Columns: [Expense ID, Store, Category Name, Remarks, User, Date, Time, Total Amount]
        const entries: ExpenseEntry[] = (jsonData as any[][])
          .slice(1) // Skip the header row itself
          .filter((row: any[]) => row && row[0] && row[1]) // Ensure valid rows
          .map((row: any[]) => {
            // Helper to handle Excel serial dates if needed
            let dateStr = String(row[5] || '');
            if (typeof row[5] === 'number') {
                const dateObj = XLSX.utils.format_cell({ v: row[5], t: 'd' });
                dateStr = dateObj;
            }

            return {
              expenseId: String(row[0] || ''),
              store: String(row[1] || ''),
              category: String(row[2] || ''),
              remarks: String(row[3] || ''),
              user: String(row[4] || ''),
              date: dateStr,
              time: String(row[6] || ''),
              amount: parseFloat(row[7]) || 0,
            };
          });

        resolve(entries);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
