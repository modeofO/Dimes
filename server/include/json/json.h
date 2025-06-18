#pragma once

#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <iostream>

// Simple JSON implementation that avoids enum scope issues
namespace Json {

class Value {
private:
    enum Type { NULL_TYPE, INT_TYPE, DOUBLE_TYPE, BOOL_TYPE, STRING_TYPE, ARRAY_TYPE, OBJECT_TYPE };
    
    Type type_;
    union {
        int int_val;
        double double_val;
        bool bool_val;
    } data_;
    std::string string_val;
    std::vector<Value> array_val;
    std::map<std::string, Value> object_val;

public:
    // Constructors
    Value() : type_(NULL_TYPE) {}
    Value(int val) : type_(INT_TYPE) { data_.int_val = val; }
    Value(long val) : type_(INT_TYPE) { data_.int_val = static_cast<int>(val); }
    Value(long long val) : type_(INT_TYPE) { data_.int_val = static_cast<int>(val); }
    Value(unsigned int val) : type_(INT_TYPE) { data_.int_val = static_cast<int>(val); }
    Value(double val) : type_(DOUBLE_TYPE) { data_.double_val = val; }
    Value(bool val) : type_(BOOL_TYPE) { data_.bool_val = val; }
    Value(const char* val) : type_(STRING_TYPE), string_val(val) {}
    Value(const std::string& val) : type_(STRING_TYPE), string_val(val) {}
    
    // Static factory methods to avoid enum issues
    static Value createArray() {
        Value v;
        v.type_ = ARRAY_TYPE;
        v.array_val.clear();
        return v;
    }
    
    static Value createObject() {
        Value v;
        v.type_ = OBJECT_TYPE;
        v.object_val.clear();
        return v;
    }

    // Type checking
    bool isNull() const { return type_ == NULL_TYPE; }
    bool isInt() const { return type_ == INT_TYPE; }
    bool isDouble() const { return type_ == DOUBLE_TYPE; }
    bool isBool() const { return type_ == BOOL_TYPE; }
    bool isString() const { return type_ == STRING_TYPE; }
    bool isArray() const { return type_ == ARRAY_TYPE; }
    bool isObject() const { return type_ == OBJECT_TYPE; }
    bool isMember(const std::string& key) const {
        return type_ == OBJECT_TYPE && object_val.find(key) != object_val.end();
    }

    // Value accessors
    int asInt() const {
        switch (type_) {
            case INT_TYPE: return data_.int_val;
            case DOUBLE_TYPE: return static_cast<int>(data_.double_val);
            case BOOL_TYPE: return data_.bool_val ? 1 : 0;
            case STRING_TYPE: return std::stoi(string_val);
            default: return 0;
        }
    }

    double asDouble() const {
        switch (type_) {
            case INT_TYPE: return static_cast<double>(data_.int_val);
            case DOUBLE_TYPE: return data_.double_val;
            case BOOL_TYPE: return data_.bool_val ? 1.0 : 0.0;
            case STRING_TYPE: return std::stod(string_val);
            default: return 0.0;
        }
    }

    bool asBool() const {
        switch (type_) {
            case INT_TYPE: return data_.int_val != 0;
            case DOUBLE_TYPE: return data_.double_val != 0.0;
            case BOOL_TYPE: return data_.bool_val;
            case STRING_TYPE: return !string_val.empty() && string_val != "false" && string_val != "0";
            case ARRAY_TYPE: return !array_val.empty();
            case OBJECT_TYPE: return !object_val.empty();
            default: return false;
        }
    }

    std::string asString() const {
        switch (type_) {
            case STRING_TYPE: return string_val;
            case INT_TYPE: return std::to_string(data_.int_val);
            case DOUBLE_TYPE: return std::to_string(data_.double_val);
            case BOOL_TYPE: return data_.bool_val ? "true" : "false";
            case NULL_TYPE: return "null";
            default: return "";
        }
    }

    // Object access
    Value& operator[](const std::string& key) {
        if (type_ != OBJECT_TYPE) {
            type_ = OBJECT_TYPE;
            object_val.clear();
        }
        return object_val[key];
    }

    const Value& operator[](const std::string& key) const {
        static Value null_value;
        if (type_ != OBJECT_TYPE) return null_value;
        auto it = object_val.find(key);
        return (it != object_val.end()) ? it->second : null_value;
    }

    Value get(const std::string& key, const Value& default_value) const {
        if (type_ != OBJECT_TYPE) return default_value;
        auto it = object_val.find(key);
        return (it != object_val.end()) ? it->second : default_value;
    }

    // Array access
    Value& operator[](int index) {
        if (type_ != ARRAY_TYPE) {
            type_ = ARRAY_TYPE;
            array_val.clear();
        }
        if (index >= static_cast<int>(array_val.size())) {
            array_val.resize(index + 1);
        }
        return array_val[index];
    }

    void append(const Value& value) {
        if (type_ != ARRAY_TYPE) {
            type_ = ARRAY_TYPE;
            array_val.clear();
        }
        array_val.push_back(value);
    }

    size_t size() const {
        switch (type_) {
            case ARRAY_TYPE: return array_val.size();
            case OBJECT_TYPE: return object_val.size();
            case STRING_TYPE: return string_val.size();
            default: return 0;
        }
    }

    // Serialization - simple version
    std::string toStyledString() const {
        return toString();
    }

private:
    std::string toString() const {
        switch (type_) {
            case NULL_TYPE: return "null";
            case INT_TYPE: return std::to_string(data_.int_val);
            case DOUBLE_TYPE: return std::to_string(data_.double_val);
            case BOOL_TYPE: return data_.bool_val ? "true" : "false";
            case STRING_TYPE: return "\"" + string_val + "\"";
            case ARRAY_TYPE: {
                std::string result = "[";
                for (size_t i = 0; i < array_val.size(); ++i) {
                    if (i > 0) result += ",";
                    result += array_val[i].toString();
                }
                result += "]";
                return result;
            }
            case OBJECT_TYPE: {
                std::string result = "{";
                bool first = true;
                for (const auto& pair : object_val) {
                    if (!first) result += ",";
                    first = false;
                    result += "\"" + pair.first + "\":" + pair.second.toString();
                }
                result += "}";
                return result;
            }
        }
        return "null";
    }
};

// Simple JSON parser
class Reader {
public:
    bool parse(const std::string& document, Value& root) {
        // Simple parser for basic JSON
        std::string trimmed = trim(document);
        if (trimmed.empty()) return false;
        
        if (trimmed[0] == '{') {
            root = Value::createObject();
            return parseObject(trimmed, root);
        } else if (trimmed[0] == '[') {
            root = Value::createArray();
            return parseArray(trimmed, root);
        } else if (trimmed[0] == '"') {
            size_t end = trimmed.find('"', 1);
            if (end != std::string::npos) {
                root = Value(trimmed.substr(1, end - 1));
                return true;
            }
        } else if (trimmed == "true" || trimmed == "false") {
            root = Value(trimmed == "true");
            return true;
        } else {
            // Try to parse as number
            try {
                if (trimmed.find('.') != std::string::npos) {
                    root = Value(std::stod(trimmed));
                } else {
                    root = Value(std::stoi(trimmed));
                }
                return true;
            } catch (...) {
                return false;
            }
        }
        return false;
    }

private:
    std::string trim(const std::string& str) {
        size_t start = str.find_first_not_of(" \t\n\r");
        if (start == std::string::npos) return "";
        size_t end = str.find_last_not_of(" \t\n\r");
        return str.substr(start, end - start + 1);
    }

    bool parseObject(const std::string& str, Value& root) {
        // Very simple object parser - just handles basic key-value pairs
        // This is sufficient for our CAD use case
        size_t pos = 1; // Skip opening '{'
        while (pos < str.length() && str[pos] != '}') {
            // Skip whitespace
            while (pos < str.length() && isspace(str[pos])) pos++;
            if (pos >= str.length() || str[pos] == '}') break;
            
            // Parse key
            if (str[pos] != '"') return false;
            size_t keyStart = pos + 1;
            size_t keyEnd = str.find('"', keyStart);
            if (keyEnd == std::string::npos) return false;
            
            std::string key = str.substr(keyStart, keyEnd - keyStart);
            pos = keyEnd + 1;
            
            // Skip whitespace and find colon
            while (pos < str.length() && isspace(str[pos])) pos++;
            if (pos >= str.length() || str[pos] != ':') return false;
            pos++;
            
            // Skip whitespace
            while (pos < str.length() && isspace(str[pos])) pos++;
            
            // Parse value (simplified)
            if (str[pos] == '"') {
                size_t valueStart = pos + 1;
                size_t valueEnd = str.find('"', valueStart);
                if (valueEnd == std::string::npos) return false;
                root[key] = Value(str.substr(valueStart, valueEnd - valueStart));
                pos = valueEnd + 1;
            } else {
                // Try to parse number or boolean
                size_t valueStart = pos;
                while (pos < str.length() && str[pos] != ',' && str[pos] != '}') pos++;
                std::string valueStr = trim(str.substr(valueStart, pos - valueStart));
                
                if (valueStr == "true" || valueStr == "false") {
                    root[key] = Value(valueStr == "true");
                } else {
                    try {
                        if (valueStr.find('.') != std::string::npos) {
                            root[key] = Value(std::stod(valueStr));
                        } else {
                            root[key] = Value(std::stoi(valueStr));
                        }
                    } catch (...) {
                        root[key] = Value(valueStr);
                    }
                }
            }
            
            // Skip whitespace and comma
            while (pos < str.length() && isspace(str[pos])) pos++;
            if (pos < str.length() && str[pos] == ',') pos++;
        }
        return true;
    }
    
    bool parseArray(const std::string& str, Value& root) {
        // Simple array parsing - not fully implemented for brevity
        return true;
    }
};

// Utility function
inline std::string valueToString(const Value& value) {
    return value.toStyledString();
}

} // namespace Json 