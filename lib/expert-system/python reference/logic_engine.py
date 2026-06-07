from fruit_rules import fruit_rules


# Strong unique keywords
STRONG_KEYWORDS = [
    "hairy",
    "spiky",
    "curved",
    "star-shaped",
    "pear-shaped",
    "cylindrical",
    "dragon fruit",
    "queen of fruits",
    "king of fruits",
    "largest fruit",
    "crown fruit",
    "wine fruit",
    "monkey fruit",
    "doctor fruit",
    "easy peel",
    "fuzzy",
    "cluster fruit",
    "water rich fruit"
]


# Medium strength keywords
MEDIUM_KEYWORDS = [
    "tropical",
    "berry",
    "citrus",
    "sweet",
    "juicy",
    "rough",
    "soft",
    "hard",
    "round",
    "oval"
]


def preprocess_input(user_input):

    user_input = user_input.lower()

    words = user_input.split()

    return words, user_input


def calculate_score(fruit_data, words, full_text):

    score = 0

    for category in fruit_data:

        if isinstance(fruit_data[category], list):

            for value in fruit_data[category]:

                value = value.lower()

                # Exact phrase matching
                if value in full_text:

                    if value in STRONG_KEYWORDS:
                        score += 10

                    elif value in MEDIUM_KEYWORDS:
                        score += 5

                    else:
                        score += 3

                # Individual word matching
                value_words = value.split()

                for word in value_words:

                    if word in words:

                        if word in STRONG_KEYWORDS:
                            score += 5

                        elif word in MEDIUM_KEYWORDS:
                            score += 2

                        else:
                            score += 1

    return score


def detect_fruit(user_input):

    words, full_text = preprocess_input(user_input)

    best_fruit = None
    best_score = 0

    fruit_scores = {}

    for fruit_name, fruit_data in fruit_rules.items():

        score = calculate_score(
            fruit_data,
            words,
            full_text
        )

        fruit_scores[fruit_name] = score

        if score > best_score:
            best_score = score
            best_fruit = fruit_name

    return best_fruit, best_score, fruit_scores


def show_top_matches(fruit_scores, top_n=5):

    sorted_fruits = sorted(
        fruit_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return sorted_fruits[:top_n]


def confidence_percentage(best_score):

    percentage = min(best_score * 2.5, 99)

    return round(percentage, 2)


def main():

    print("\n========== FRUIT EXPERT SYSTEM ==========\n")

    while True:

        user_input = input(
            "Describe a fruit (or type quit): "
        )

        if user_input.lower() == "quit":

            print("\nExiting Fruit Expert System...")
            break

        best_fruit, best_score, fruit_scores = detect_fruit(
            user_input
        )

        confidence = confidence_percentage(best_score)

        print("\nMost Probable Fruit:")
        print(f"-> {best_fruit.upper()}")

        print(f"\nConfidence: {confidence}%")

        print(f"Raw Score: {best_score}")

        print("\nTop Matches:")

        top_matches = show_top_matches(fruit_scores)

        for fruit, score in top_matches:

            print(f"{fruit} -> {score}")

        print("\n----------------------------------\n")


if __name__ == "__main__":
    main()