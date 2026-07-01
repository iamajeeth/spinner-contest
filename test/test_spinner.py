import requests
import csv
from collections import Counter

URL = "https://tpqwbsochispnohwaowq.supabase.co/functions/v1/spin"

HEADERS = {
    "Content-Type": "application/json",
    "apikey": "sb_publishable_Tp0l1o4xIU_oJelbXTVzfw_ueNbqPfb"
}

TOTAL_SPINS = 1016
START_MOBILE = 9876500000

results = []
prize_counter = Counter()

previous_prize = None
current_streak = 0
max_streak = {}

success = 0
failed = 0

print(f"Starting {TOTAL_SPINS} spins...\n")

for i in range(TOTAL_SPINS):

    mobile = str(START_MOBILE + i)

    response = requests.post(
        URL,
        headers=HEADERS,
        json={"mobile": mobile},
        timeout=30
    )

    if response.status_code != 200:
        failed += 1
        print(f"{mobile} -> ERROR {response.status_code}")
        continue

    success += 1

    body = response.json()

    prize = body["prize"]["title"]

    prize_counter[prize] += 1

    if prize == previous_prize:
        current_streak += 1
    else:
        current_streak = 1
        previous_prize = prize

    max_streak[prize] = max(
        max_streak.get(prize, 0),
        current_streak
    )

    results.append([
        i + 1,
        mobile,
        prize,
        body["prize"]["code"]
    ])

print("\nSaving CSV...")

with open("spin_results.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)

    writer.writerow([
        "Spin",
        "Mobile",
        "Prize",
        "Code"
    ])

    writer.writerows(results)

print("\n==============================")
print("SUMMARY")
print("==============================")

print(f"Total Spins : {TOTAL_SPINS}")
print(f"Success     : {success}")
print(f"Failed      : {failed}")

print("\nPrize Distribution")

for prize, count in prize_counter.items():

    percentage = count / success * 100

    print(
        f"{prize:25} "
        f"{count:5} "
        f"{percentage:6.2f}%"
    )

print("\nMaximum Consecutive Streak")

for prize, streak in max_streak.items():

    print(
        f"{prize:25} {streak}"
    )

print("\nCSV generated: spin_results.csv")