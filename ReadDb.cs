using System;
using System.Data.SQLite;
using System.Text;

class Program {
    static void Main() {
        string dbPath = "workspace/幻想乡梦游电子界.cdb";
        string connStr = $"Data Source={dbPath};Version=3;";
        
        using (var conn = new SQLiteConnection(connStr)) {
            conn.Open();
            using (var cmd = new SQLiteCommand("SELECT id, name, desc FROM texts", conn)) {
                using (var reader = cmd.ExecuteReader()) {
                    while (reader.Read()) {
                        Console.WriteLine($"ID: {reader.GetInt32(0)}");
                        Console.OutputEncoding = Encoding.GetEncoding("GBK");
                        Console.WriteLine($"Name: {reader.GetString(1)}");
                        string desc = reader.GetString(2);
                        Console.WriteLine($"Desc: {desc.Substring(0, Math.Min(500, desc.Length))}");
                        Console.WriteLine("---");
                    }
                }
            }
        }
    }
}