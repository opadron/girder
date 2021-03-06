# Set this variable to the minimum coverage percentage to be considered passing
set(COVERAGE_MINIMUM_PASS 90)
set(JS_COVERAGE_MINIMUM_PASS 75)

python_tests_init()
javascript_tests_init()

add_eslint_test(
  grunt_main Gruntfile.js
)
add_eslint_test(
  grunt_modules grunt_tasks
)
add_python_style_test(python_static_analysis_core "${PROJECT_SOURCE_DIR}/girder")
add_python_style_test(python_static_analysis_core_tests "${PROJECT_SOURCE_DIR}/tests")
add_python_style_test(python_static_analysis_ansible_client_tests "${PROJECT_SOURCE_DIR}/clients/ansible")

# These are performed approximately in the order listed.  upload is slower, so
# start it first, so that if we have parallelism it doesn't hold things up much
add_python_test(upload RESOURCE_LOCKS replicaset)
add_python_test(api_describe)
add_python_test(access)
add_python_test(assetstore)
add_python_test(collection)
add_python_test(custom_root)
add_python_test(events)
add_python_test(file)
add_python_test(folder)
add_python_test(group)
add_python_test(install)
add_python_test(item)
add_python_test(mail)
add_python_test(model)
add_python_test(notification TIMEOUT 50)
add_python_test(plugin_utilities)
add_python_test(resource)
add_python_test(rest_decorator)
add_python_test(rest_util)
add_python_test(routes)
add_python_test(search)
add_python_test(size)
add_python_test(system)
add_python_test(token)
add_python_test(user)
add_python_test(webroot)

add_python_test(py_client.cli BIND_SERVER RESOURCE_LOCKS py_client_test_dir)
add_python_test(py_client.lib BIND_SERVER RESOURCE_LOCKS py_client_test_dir)

add_web_client_test(data_filesystem "${PROJECT_SOURCE_DIR}/clients/web/test/spec/dataSpec.js" ASSETSTORE filesystem)
add_web_client_test(data_gridfs "${PROJECT_SOURCE_DIR}/clients/web/test/spec/dataSpec.js" ASSETSTORE gridfs)
add_web_client_test(data_gridfsrs "${PROJECT_SOURCE_DIR}/clients/web/test/spec/dataSpec.js" ASSETSTORE gridfsrs RESOURCE_LOCKS replicaset)
add_web_client_test(data_s3 "${PROJECT_SOURCE_DIR}/clients/web/test/spec/dataSpec.js" ASSETSTORE s3 WEBSECURITY false)
add_web_client_test(admin "${PROJECT_SOURCE_DIR}/clients/web/test/spec/adminSpec.js" ASSETSTORE s3 WEBSECURITY false
  PLUGIN_DIRS "${PROJECT_SOURCE_DIR}/plugins:${PROJECT_SOURCE_DIR}/tests/test_plugins")
add_web_client_test(collection "${PROJECT_SOURCE_DIR}/clients/web/test/spec/collectionSpec.js")
add_web_client_test(group "${PROJECT_SOURCE_DIR}/clients/web/test/spec/groupSpec.js")
add_web_client_test(user "${PROJECT_SOURCE_DIR}/clients/web/test/spec/userSpec.js")
add_web_client_test(item "${PROJECT_SOURCE_DIR}/clients/web/test/spec/itemSpec.js")
add_web_client_test(folder "${PROJECT_SOURCE_DIR}/clients/web/test/spec/folderSpec.js")
add_web_client_test(routing "${PROJECT_SOURCE_DIR}/clients/web/test/spec/routingSpec.js")
add_web_client_test(version "${PROJECT_SOURCE_DIR}/clients/web/test/spec/versionSpec.js")
add_web_client_test(custom_widgets "${PROJECT_SOURCE_DIR}/clients/web/test/spec/customWidgetsSpec.js")
add_web_client_test(widgets "${PROJECT_SOURCE_DIR}/clients/web/test/spec/widgetsSpec.js")
add_web_client_test(datetime_widget "${PROJECT_SOURCE_DIR}/clients/web/test/spec/dateTimeWidgetSpec.js")
add_web_client_test(empty_layout "${PROJECT_SOURCE_DIR}/clients/web/test/spec/emptyLayoutSpec.js")
add_web_client_test(swagger "${PROJECT_SOURCE_DIR}/clients/web/test/spec/swaggerSpec.js" BASEURL "/api/v1" NOCOVERAGE)

add_subdirectory(clients)
add_subdirectory(packaging)

# Look for CMakeLists.txt in plugin dirs, include if they exist
file(GLOB pluginDirs "${PROJECT_SOURCE_DIR}/plugins/*")
foreach(pluginDir ${pluginDirs})
  if(EXISTS "${pluginDir}/plugin.cmake")
    get_filename_component(pluginName "${pluginDir}" NAME)
    message(STATUS "Including plugin.cmake from \"${pluginName}\"")
    include("${pluginDir}/plugin.cmake")
  endif()
endforeach()
