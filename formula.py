from datetime import datetime, timedelta

# Rentang tanggal Juli 2025
start_date = datetime(2025, 7, 1)
end_date = datetime(2025, 7, 31)

current_date = start_date
while current_date <= end_date:
    for _ in range(26):  # ulang 26 kali
        # Gunakan %#d dan %#m di Windows
        print(current_date.strftime("%#d/%#m/%Y"))
    current_date += timedelta(days=1)
