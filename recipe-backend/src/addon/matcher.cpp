#include <napi.h>
#include <vector>
#include <string>
#include <sstream>
#include <unordered_set>
#include <algorithm>

// lowercase string
std::string toLower(std::string data) {
    std::transform(data.begin(), data.end(), data.begin(),
        [](unsigned char c){ return std::tolower(c); });
    return data;
}

// clean punctuation
std::string cleanWord(std::string data) {
    std::string clean;
    for (char c : data) {
        if (std::isalpha(c)) {
            clean += c;
        }
    }
    return clean;
}


// Levenshtein Distance (Optimized O(n) space)
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

Napi::Value CalculateMatchScore(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Arrays expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array userPantry = info[0].As<Napi::Array>();
    Napi::Array recipeIngredients = info[1].As<Napi::Array>();

    float matchCount = 0;
    uint32_t recipeTotal = recipeIngredients.Length();

    // LOOP 1: Go through every ingredient in the recipe
    for (uint32_t i = 0; i < recipeTotal; i++) {
        std::string rawIngredient = toLower(recipeIngredients.Get(i).As<Napi::String>().Utf8Value());
        
        bool found = false;

        // LOOP 2: Go through user's pantry items
        for (uint32_t j = 0; j < userPantry.Length(); j++) {
            std::string userItem = toLower(userPantry.Get(j).As<Napi::String>().Utf8Value());
            
            // STRATEGY: Split the recipe string into tokens
            // Recipe: "4 garlic cloves, crushed" -> ["4", "garlic", "cloves", "crushed"]
            std::stringstream ss(rawIngredient);
            std::string word;
            
            while (ss >> word) {
                std::string cleaned = cleanWord(word); // Remove punctuation
                
                // Skip tiny words like "of", "in", "1/2"
                if (cleaned.length() < 3) continue; 

                // Check Exact Match OR Fuzzy Match
                if (cleaned == userItem) {
                    found = true;
                    break;
                }
                if (levenshtein(cleaned, userItem) <= 1 && userItem.length() > 3) {
                    found = true;
                    break;
                }
            }
            if (found) break;
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