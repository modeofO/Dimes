#pragma once

#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <memory>

namespace Json {

class Value {
public:
    enum ValueType {
        nullValue = 0,
        intValue,
        uintValue,
        realValue,
        stringValue,
        booleanValue,
        arrayValue,
        objectValue
    };

    ValueType type_;
    union {
        bool bool_value;
        int int_value;
        double real_value;
        int64_t long_value;
    } value_;
    std::string string_value;
    std::vector<Value> array_value;
    std::map<std::string, Value> object_value;

public:
    Value() : type_(nullValue) {}
    Value(bool value) : type_(booleanValue) { value_.bool_value = value; }
    Value(int value) : type_(intValue) { value_.int_value = value; }
    Value(int64_t value) : type_(intValue) { value_.long_value = value; }
    Value(double value) : type_(realValue) { value_.real_value = value; }
    Value(const std::string& value) : type_(stringValue), string_value(value) {}
    Value(const char* value) : type_(stringValue), string_value(value) {}
    Value(ValueType type) : type_(type) {
        if (type == arrayValue) {
            array_value = std::vector<Value>();
        } else if (type == objectValue) {
            object_value = std::map<std::string, Value>();
        }
    }

    // Copy constructor
    Value(const Value& other) : type_(other.type_) {
        switch (type_) {
            case booleanValue:
                value_.bool_value = other.value_.bool_value;
                break;
            case intValue:
                value_.int_value = other.value_.int_value;
                break;
            case realValue:
                value_.real_value = other.value_.real_value;
                break;
            case stringValue:
                string_value = other.string_value;
                break;
            case arrayValue:
                array_value = other.array_value;
                break;
            case objectValue:
                object_value = other.object_value;
                break;
            default:
                break;
        }
    }

    // Assignment operator
    Value& operator=(const Value& other) {
        if (this != &other) {
            type_ = other.type_;
            switch (type_) {
                case booleanValue:
                    value_.bool_value = other.value_.bool_value;
                    break;
                case intValue:
                    value_.int_value = other.value_.int_value;
                    break;
                case realValue:
                    value_.real_value = other.value_.real_value;
                    break;
                case stringValue:
                    string_value = other.string_value;
                    break;
                case arrayValue:
                    array_value = other.array_value;
                    break;
                case objectValue:
                    object_value = other.object_value;
                    break;
                default:
                    break;
            }
        }
        return *this;
    }

    // Move assignment operator
    Value& operator=(Value&& other) noexcept {
        if (this != &other) {
            type_ = other.type_;
            switch (type_) {
                case booleanValue:
                    value_.bool_value = other.value_.bool_value;
                    break;
                case intValue:
                    value_.int_value = other.value_.int_value;
                    break;
                case realValue:
                    value_.real_value = other.value_.real_value;
                    break;
                case stringValue:
                    string_value = std::move(other.string_value);
                    break;
                case arrayValue:
                    array_value = std::move(other.array_value);
                    break;
                case objectValue:
                    object_value = std::move(other.object_value);
                    break;
                default:
                    break;
            }
            other.type_ = nullValue;
        }
        return *this;
    }

    // Array access
    Value& operator[](int index) {
        if (type_ != arrayValue) {
            type_ = arrayValue;
            array_value = std::vector<Value>();
        }
        if (index >= static_cast<int>(array_value.size())) {
            array_value.resize(index + 1);
        }
        return array_value[index];
    }

    // Object access
    Value& operator[](const std::string& key) {
        if (type_ != objectValue) {
            type_ = objectValue;
            object_value = std::map<std::string, Value>();
        }
        return object_value[key];
    }

    // Get methods with defaults
    Value get(const std::string& key, const Value& defaultValue) const {
        if (type_ == objectValue) {
            auto it = object_value.find(key);
            if (it != object_value.end()) {
                return it->second;
            }
        }
        return defaultValue;
    }

    std::string asString() const {
        if (type_ == stringValue) return string_value;
        if (type_ == intValue) return std::to_string(value_.int_value);
        if (type_ == realValue) return std::to_string(value_.real_value);
        if (type_ == booleanValue) return value_.bool_value ? "true" : "false";
        return "";
    }

    int asInt() const {
        if (type_ == intValue) return value_.int_value;
        if (type_ == realValue) return static_cast<int>(value_.real_value);
        if (type_ == stringValue) return std::stoi(string_value);
        return 0;
    }

    double asDouble() const {
        if (type_ == realValue) return value_.real_value;
        if (type_ == intValue) return static_cast<double>(value_.int_value);
        if (type_ == stringValue) return std::stod(string_value);
        return 0.0;
    }

    bool asBool() const {
        if (type_ == booleanValue) return value_.bool_value;
        return false;
    }

    bool isMember(const std::string& key) const {
        if (type_ == objectValue) {
            return object_value.find(key) != object_value.end();
        }
        return false;
    }

    void append(const Value& value) {
        if (type_ != arrayValue) {
            type_ = arrayValue;
            array_value = std::vector<Value>();
        }
        array_value.push_back(value);
    }

    size_t size() const {
        if (type_ == arrayValue) return array_value.size();
        if (type_ == objectValue) return object_value.size();
        return 0;
    }
};

class Reader {
public:
    bool parse(const std::string& document, Value& root) {
        // Simple JSON parsing - for basic cases only
        // This is a minimal implementation for basic object/string parsing
        
        // Skip whitespace
        std::string trimmed = document;
        size_t start = trimmed.find_first_not_of(" \t\n\r");
        if (start == std::string::npos) return false;
        trimmed = trimmed.substr(start);
        
        if (trimmed.empty()) return false;
        
        if (trimmed[0] == '{') {
            return parseObject(trimmed, root);
        } else if (trimmed[0] == '[') {
            return parseArray(trimmed, root);
        } else if (trimmed[0] == '"') {
            return parseString(trimmed, root);
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
    }

private:
    bool parseObject(const std::string& str, Value& root) {
        root = Value(Value::objectValue);
        
        // Find pairs between { and }
        if (str.length() < 2 || str[0] != '{') return false;
        
        size_t pos = 1;
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
            
            // Parse value (simplified - only handles strings and numbers)
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
                std::string valueStr = str.substr(valueStart, pos - valueStart);
                
                // Trim
                size_t start = valueStr.find_first_not_of(" \t\n\r");
                size_t end = valueStr.find_last_not_of(" \t\n\r");
                if (start != std::string::npos && end != std::string::npos) {
                    valueStr = valueStr.substr(start, end - start + 1);
                }
                
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
        root = Value(Value::arrayValue);
        // Simplified array parsing - not implemented for brevity
        return true;
    }
    
    bool parseString(const std::string& str, Value& root) {
        if (str.length() < 2 || str[0] != '"') return false;
        size_t end = str.find('"', 1);
        if (end == std::string::npos) return false;
        root = Value(str.substr(1, end - 1));
        return true;
    }
};

// Function to convert Value to string
std::string valueToString(const Value& value) {
    switch (value.type_) {
        case Value::nullValue:
            return "null";
        case Value::booleanValue:
            return value.asBool() ? "true" : "false";
        case Value::intValue:
            return std::to_string(value.asInt());
        case Value::realValue:
            return std::to_string(value.asDouble());
        case Value::stringValue:
            return "\"" + value.asString() + "\"";
        case Value::arrayValue: {
            std::string result = "[";
            for (size_t i = 0; i < value.size(); ++i) {
                if (i > 0) result += ",";
                result += valueToString(value.array_value[i]);
            }
            result += "]";
            return result;
        }
        case Value::objectValue: {
            std::string result = "{";
            bool first = true;
            for (const auto& pair : value.object_value) {
                if (!first) result += ",";
                first = false;
                result += "\"" + pair.first + "\":" + valueToString(pair.second);
            }
            result += "}";
            return result;
        }
    }
    return "null";
}

} // namespace Json 