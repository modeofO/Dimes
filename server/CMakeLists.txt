cmake_minimum_required(VERSION 3.16)
project(cad-engine-server VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find OpenCASCADE
if(WIN32)
    # Help CMake find OpenCASCADE on Windows
    if(DEFINED ENV{CASROOT})
        set(OpenCASCADE_DIR "$ENV{CASROOT}/cmake" CACHE PATH "Path to OpenCASCADE cmake config")
        list(APPEND CMAKE_PREFIX_PATH "$ENV{CASROOT}")
        message(STATUS "Using CASROOT: $ENV{CASROOT}")
    else()
        # Common installation paths
        set(OCCT_POSSIBLE_PATHS
            "C:/OpenCASCADE-7.7.0"
            "C:/OpenCASCADE-7.6.0"
            "C:/OCCT-7.7.0"
            "C:/OCCT-7.6.0"
        )
        foreach(OCCT_PATH ${OCCT_POSSIBLE_PATHS})
            if(EXISTS "${OCCT_PATH}/cmake/OpenCASCADEConfig.cmake")
                set(OpenCASCADE_DIR "${OCCT_PATH}/cmake" CACHE PATH "Path to OpenCASCADE cmake config")
                message(STATUS "Found OpenCASCADE at: ${OCCT_PATH}")
                break()
            endif()
        endforeach()
    endif()
endif()

# Try to find OpenCASCADE, but handle VTK dependency issues gracefully
find_package(OpenCASCADE QUIET)

if(NOT OpenCASCADE_FOUND)
    message(STATUS "Standard OpenCASCADE find failed, trying manual detection...")
    
    # Manually set up OpenCASCADE paths
    if(WIN32 AND DEFINED ENV{CASROOT})
        set(OpenCASCADE_INCLUDE_DIR "$ENV{CASROOT}/inc")
        set(OpenCASCADE_LIBRARY_DIR "$ENV{CASROOT}/win64/vc14/lib")
        
        if(EXISTS "${OpenCASCADE_INCLUDE_DIR}" AND EXISTS "${OpenCASCADE_LIBRARY_DIR}")
            message(STATUS "Manual OpenCASCADE detection successful")
            set(OpenCASCADE_FOUND TRUE)
        endif()
    endif()
    
    if(NOT OpenCASCADE_FOUND)
        message(FATAL_ERROR "OpenCASCADE not found. Please check your installation.")
    endif()
endif()

# Find JSON library (jsoncpp)
find_package(PkgConfig QUIET)
if(PkgConfig_FOUND)
    pkg_check_modules(JSONCPP jsoncpp)
endif()

if(NOT JSONCPP_FOUND)
    # Try to find jsoncpp using find_package
    find_package(jsoncpp QUIET)
    if(jsoncpp_FOUND)
        set(JSONCPP_LIBRARIES jsoncpp_lib)
        set(JSONCPP_FOUND TRUE)
        message(STATUS "Found jsoncpp using find_package")
    endif()
endif()

if(NOT JSONCPP_FOUND)
    message(STATUS "jsoncpp not found via package manager, using header-only fallback")
    # Create a simple JSON implementation fallback or use bundled jsoncpp
    # For now, we'll create minimal JSON handling
    add_definitions(-DUSE_SIMPLE_JSON)
endif()

# Build configuration
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(MSVC)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /O2 /DNDEBUG")
    else()
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -DNDEBUG")
    endif()
else()
    if(MSVC)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /Od /Zi /W4")
    else()
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0 -Wall -Wextra")
    endif()
endif()

# Include directories
include_directories(include/)

# Add OpenCASCADE include directories
if(OpenCASCADE_INCLUDE_DIR)
    include_directories(${OpenCASCADE_INCLUDE_DIR})
    message(STATUS "Using OpenCASCADE include dir: ${OpenCASCADE_INCLUDE_DIR}")
elseif(DEFINED ENV{CASROOT})
    include_directories("$ENV{CASROOT}/inc")
    message(STATUS "Using CASROOT include dir: $ENV{CASROOT}/inc")
endif()

# Add jsoncpp include directories if found
if(JSONCPP_FOUND AND JSONCPP_INCLUDE_DIRS)
    include_directories(${JSONCPP_INCLUDE_DIRS})
    message(STATUS "Using jsoncpp include dirs: ${JSONCPP_INCLUDE_DIRS}")
endif()

# Source files
file(GLOB_RECURSE SOURCES "src/*.cpp")
file(GLOB_RECURSE HEADERS "include/*.h")

# Executable
add_executable(cad-server ${SOURCES})

# Link only essential OpenCASCADE libraries (avoid VTK dependencies)
# Start with the most basic libraries first - exclude TKMesh which may have TBB dependency
set(OCCT_ESSENTIAL_LIBS
    TKernel
    TKMath 
    TKBRep
    TKGeomBase
    TKGeomAlgo
    TKTopAlgo
    TKPrimAlgo
)

# Link OpenCASCADE libraries
set(AVAILABLE_OCCT_LIBS)

# If standard find_package worked, use TARGET names
if(TARGET TKernel)
    message(STATUS "Using OpenCASCADE targets from find_package")
    foreach(lib ${OCCT_ESSENTIAL_LIBS})
        if(TARGET ${lib})
            list(APPEND AVAILABLE_OCCT_LIBS ${lib})
            message(STATUS "Found essential OCCT library: ${lib}")
        endif()
    endforeach()
    
    # Add optional libraries if available
    set(OCCT_OPTIONAL_LIBS TKG2d TKG3d TKShHealing TKBool TKBO TKFillet TKOffset TKMesh TKSTEP TKSTEPBase TKSTEPAttr TKSTEP209 TKXSBase TKXCAFApp)
    foreach(lib ${OCCT_OPTIONAL_LIBS})
        if(TARGET ${lib})
            list(APPEND AVAILABLE_OCCT_LIBS ${lib})
            message(STATUS "Found optional OCCT library: ${lib}")
        endif()
    endforeach()
    
else()
    # Manual library detection for Windows
    message(STATUS "Using manual OpenCASCADE library detection")
    if(WIN32 AND DEFINED ENV{CASROOT})
        set(OCCT_LIB_DIR "$ENV{CASROOT}/win64/vc14/lib")
        
        foreach(lib ${OCCT_ESSENTIAL_LIBS})
            set(lib_path "${OCCT_LIB_DIR}/${lib}.lib")
            if(EXISTS "${lib_path}")
                list(APPEND AVAILABLE_OCCT_LIBS "${lib_path}")
                message(STATUS "Found OCCT library file: ${lib_path}")
            endif()
        endforeach()
        
        # Add optional libraries for manual detection
        set(OCCT_OPTIONAL_LIBS TKG2d TKG3d TKShHealing TKBool TKBO TKFillet TKOffset TKMesh TKSTEP TKSTEPBase TKSTEPAttr TKSTEP209 TKXSBase TKXCAFApp)
        foreach(lib ${OCCT_OPTIONAL_LIBS})
            set(lib_path "${OCCT_LIB_DIR}/${lib}.lib")
            if(EXISTS "${lib_path}")
                list(APPEND AVAILABLE_OCCT_LIBS "${lib_path}")
                message(STATUS "Found OCCT optional library file: ${lib_path}")
            endif()
        endforeach()
    endif()
endif()

target_link_libraries(cad-server 
    ${AVAILABLE_OCCT_LIBS}
)

# Link jsoncpp if found
if(JSONCPP_FOUND)
    target_link_libraries(cad-server ${JSONCPP_LIBRARIES})
    message(STATUS "Linking jsoncpp libraries: ${JSONCPP_LIBRARIES}")
endif()

# Add pthread on non-Windows systems
if(NOT WIN32)
    target_link_libraries(cad-server pthread)
endif()

# Install rules
install(TARGETS cad-server DESTINATION bin) 