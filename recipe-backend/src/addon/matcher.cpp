#include <napi.h>
#include <vector>
#include <string>
#include <sstream>
#include <unordered_set>
#include <algorithm>
#include <iostream>

// STOP WORDS (Keep your list)
const std::unordered_set<std::string> STOP_WORDS = {
    "pounds", "pound", "lbs", "lb", "oz", "ounce", "ounces",
    "cup", "cups", "tbsp", "tsp", "tablespoon", "teaspoon",
    "g", "kg", "ml", "l", "dash", "pinch", "clove", "cloves",
    "can", "cans", "jar", "jars", "package", "packages",
    "large", "small", "medium", "fresh", "dried", "chopped",
    "sliced", "diced", "minced", "crushed", "accompaniments",
    "needs", "optional", "ground", "flake", "flakes", "and", "or",
    "bag", "box", "bunch", "head", "stalk", "stalks"
};

std::string toLower(std::string data) {
    std::transform(data.begin(), data.end(), data.begin(),
        [](unsigned char c){ return std::tolower(c); });
    return data;
}

int levenshtein(const std::string& s1, const std::string& s2) {
    const size_t m = s1.size();
    const size_t n = s2.size();
    if (m < n) return levenshtein(s2, s1);
    if (n == 0) return m;
    std::vector<int> prev(n + 1);
    std::vector<int> curr(n + 1);
    for (int j = 0; j <= n; j++) prev[j] = j;
    for (int i = 1; i <= m; i++) {
        curr[0] = i; 
        for (int j = 1; j <= n; j++) {
            int cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
            curr[j] = std::min({ prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost });
        }
        prev = curr;
    }
    return prev[n];
}

std::vector<std::string> splitString(const std::string& s, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(s);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}

Napi::Value CalculateMatchScore(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Arrays expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array userPantry = info[0].As<Napi::Array>();
    Napi::Array rawIngredients = info[1].As<Napi::Array>();

    // 1. Convert User Pantry to a C++ Vector for faster repeated access
    std::vector<std::string> pantryVec;
    for (uint32_t i = 0; i < userPantry.Length(); i++) {
        pantryVec.push_back(toLower(userPantry.Get(i).As<Napi::String>().Utf8Value()));
    }

    // 2. Process Recipe Ingredients
    std::vector<std::string> recipeList;
    for (uint32_t i = 0; i < rawIngredients.Length(); i++) {
        std::string raw = toLower(rawIngredients.Get(i).As<Napi::String>().Utf8Value());
        std::vector<std::string> parts = splitString(raw, ';');
        for (const auto& part : parts) {
            std::string cleanPart;
            for (char c : part) {
                if (std::isalpha(c) || c == ' ') cleanPart += c;
            }
            if (cleanPart.length() > 2) recipeList.push_back(cleanPart);
        }
    }

    float matchCount = 0;
    float recipeTotal = (float)recipeList.size();

    // 3. THE NEW LOGIC: Check Overlap Percentage
    for (const auto& recipeItem : recipeList) {
        std::stringstream ss(recipeItem);
        std::string word;
        std::vector<std::string> recipeTokens;

        // Tokenize the current recipe line (e.g. "tomato", "matzo", "balls")
        while (ss >> word) {
            if (STOP_WORDS.find(word) == STOP_WORDS.end() && word.length() >= 3) {
                recipeTokens.push_back(word);
            }
        }

        if (recipeTokens.empty()) continue; // Skip if it was just stop words

        int tokensMatched = 0;
        
        // Check each token against the User Pantry
        for (const auto& token : recipeTokens) {
            bool tokenFound = false;
            for (const auto& userItem : pantryVec) {
                if (token == userItem) {
                    tokenFound = true; break;
                }
                // Only allow fuzzy match if token is long enough
                if (userItem.length() > 3 && levenshtein(token, userItem) <= 1) {
                    tokenFound = true; break;
                }
            }
            if (tokenFound) tokensMatched++;
        }

        // 4. THE THRESHOLD CHECK
        // You must match at least 50% of the significant words in the ingredient line
        float coverage = (float)tokensMatched / (float)recipeTokens.size();
        
        if (coverage >= 0.5f) {
            matchCount++;
        }
    }

    float score = (recipeTotal > 0) ? (matchCount / recipeTotal) : 0.0f;
    return Napi::Number::New(env, score);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "calculateMatch"), Napi::Function::New(env, CalculateMatchScore));
    return exports;
}

NODE_API_MODULE(matcher, Init)