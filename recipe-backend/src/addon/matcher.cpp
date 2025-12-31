#include <napi.h>
#include <vector>
#include <string>
#include <unordered_set>
#include <algorithm>

std::string toLower(std::string data) {
    std::transform(data.begin(), data.end(), data.begin(),
        [](unsigned char c){ return std::tolower(c); });
    return data;
}

// Levenshtein Distance Algorithm: O(nm) complexity
// Returns the number of edits (insert, delete, substitute) to make strings match
int levenshtein(const std::string& s1, const std::string& s2) {
    const size_t m = s1.size();
    const size_t n = s2.size();

    // Ensure s2 is the shorter string to minimize space usage
    if (m < n) return levenshtein(s2, s1);
    if (n == 0) return m;

    // We only need two rows: the previous row and the current row
    std::vector<int> prev(n + 1);
    std::vector<int> curr(n + 1);

    // Initialize the first row (cost of inserting characters into empty string)
    for (int j = 0; j <= n; j++) prev[j] = j;

    for (int i = 1; i <= m; i++) {
        curr[0] = i; // Cost of deleting characters to reach empty string
        for (int j = 1; j <= n; j++) {
            int cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
            
            // The logic remains the same, but we only reference 'prev' and 'curr'
            curr[j] = std::min({ 
                prev[j] + 1,      // Deletion
                curr[j - 1] + 1,  // Insertion
                prev[j - 1] + cost // Substitution
            });
        }
        // Move the current row to 'prev' for the next iteration
        prev = curr;
    }

    return prev[n];
}

Napi::Value CalculateMatchScore(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Array userPantry = info[0].As<Napi::Array>();
    Napi::Array recipeIngredients = info[1].As<Napi::Array>();

    float matchCount = 0;
    uint32_t recipeTotal = recipeIngredients.Length();

    // Loop through every ingredient the recipe needs
    for (uint32_t i = 0; i < recipeTotal; i++) {
        std::string recipeIng = toLower(recipeIngredients.Get(i).As<Napi::String>().Utf8Value());
        bool found = false;

        // Compare against every item in the user's pantry
        for (uint32_t j = 0; j < userPantry.Length(); j++) {
            std::string userIng = toLower(userPantry.Get(j).As<Napi::String>().Utf8Value());

            // 1. Check for exact match
            if (userIng == recipeIng) {
                found = true;
                break;
            }

            // 2. Check for "Fuzzy" match (Levenshtein Distance)
            // If the words are long and only 1-2 letters are wrong, count it!
            int distance = levenshtein(userIng, recipeIng);
            if (distance <= 2 && recipeIng.length() > 3) {
                found = true;
                break;
            }
        }

        if (found) matchCount++;
    }

    float score = (recipeTotal > 0) ? (matchCount / (float)recipeTotal) : 0.0f;
    return Napi::Number::New(env, score);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "calculateMatch"), Napi::Function::New(env, CalculateMatchScore));
    return exports;
}

NODE_API_MODULE(matcher, Init)