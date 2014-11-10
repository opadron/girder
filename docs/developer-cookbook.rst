Developer Cookbook
==================

This cookbook consists of a set of examples of common tasks that developers may
encounter when developing Girder applications.

Client cookbook
---------------

The following examples are for common tasks that would be performed by a Girder
client application.

Authenticating to the web API
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Clients can make authenticated web API calls by passing a secure temporary token
with their requests. Tokens are obtained via the login process; the standard
login process requires the client to make an HTTP ``GET`` request to the
``api/v1/user/authentication`` route, using HTTP Basic Auth to pass the user
credentials. For example, for a user with login "john" and password "hello",
first base-64 encode the string ``"john:hello"`` which yields ``"am9objpoZWxsbw=="``.
Then take the base-64 encoded value and pass it via the ``Authorization`` header: ::

    Authorization: Basic am9objpoZWxsbw==

If the username and password are correct, you will receive a 200 status code and
a JSON document from which you can extract the authentication token, e.g.: ::

    {
      "authToken": {
        "token": "urXQSHO8aF6cLB5si0Ch0WCiblvW1m8YSFylMH9eqN1Mt9KvWUnghVDKQy545ZeA",
        "expires": "2015-04-11 00:06:14.598570"
      },
      "message": "Login succeeded.",
      "user": {
        ...
      }
    }

The ``authToken.token`` string is the token value you should pass in subsequent API
calls, which should either be passed as the ``token`` parameter in the query or
form parameters, or as the value of a custom HTTP header with the key ``Girder-Token``, e.g. ::

    Girder-Token: urXQSHO8aF6cLB5si0Ch0WCiblvW1m8YSFylMH9eqN1Mt9KvWUnghVDKQy545ZeA

.. note:: When logging in, the token is also sent to the client in a Cookie header so that web-based
   clients can persist its value conveniently for its duration. However, for security
   reasons, merely passing the cookie value back is not sufficient for authentication.

Upload a file
^^^^^^^^^^^^^

If you are using the Girder javascript client library, you can simply call the ``upload``
method of the ``girder.models.FileModel``. The first argument is the parent model
object (an ``ItemModel`` or ``FolderModel`` instance) to upload into, and the second
is a browser ``File`` object that was selected via a file input element. You can
bind to several events of that model, as in the example below.

.. code-block:: javascript

    var fileModel = new girder.models.FileModel();
    fileModel.on('g:upload.complete', function () {
        // Called when the upload finishes
    }).on('g:upload.chunkSent', function (info) {
        // Called on each chunk being sent
    }).on('g:upload.progress', function (info) {
        // Called regularly with progress updates
    }).on('g:upload.error', function (info) {
        // Called if an upload fails partway through sending the data
    }).on('g:upload.errorStarting', function (info) {
        // Called if an upload fails to start
    });
    fileModel.upload(parentFolder, fileObject);

If you don't feel like making your own upload interface, you can simply use
the ``girder.views.UploadWidget`` to provide a nice GUI interface for uploading.
It will prompt the user to drag and drop or browse for files, and then shows
a current and overall progress bar and also provides controls for resuming a
failed upload.

Server cookbook
---------------

The following examples refer to tasks that are executed by the Girder application
server.

Send a raw/streaming HTTP response body
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For consistency, the default behavior of a REST endpoint in Girder is to take
the return value of the route handler and encode it in the format specified
by the client in the ``Accepts`` header, usually ``application/json``. However,
in some cases you may want to force your endpoint to send a raw response body
back to the client. A common example would be downloading a file from the server;
we want to send just the data, not try to encode it in JSON.

If you want to send a raw response, simply make your route handler return a
generator function. In Girder, a raw response is also automatically a streaming
response, giving developers full control of the buffer size of the response
body. That is, each time you ``yield`` data in your generator function, the
buffer will be flushed to the client. As a minimal example, the following
route handler would send 10 chunks to the client, and the full response
body would be ``0123456789``.

.. code-block:: python

    @access.public
    def rawExample(self, params):
        def gen():
            for i in xrange(10):
                yield str(i)
        return gen

Sending Emails
^^^^^^^^^^^^^^

Girder has a utility module that make it easy to send emails from the server. For
the sake of maintainability and reusability of the email content itself, emails are stored
as `Mako templates <http://www.makotemplates.org/>`_ in the
**girder/mail_templates** directory. By convention, email templates should
include ``_header.mako`` above and ``_footer.mako`` below the content. If you wish
to send an email from some point within the application, you can use the
utility functions within ``girder.utility.mail_utils``, as in the example
below: ::

    from girder.utility import mail_utils

    ...

    def my_email_sending_code():
        html = mail_utils.renderTemplate('myContentTemplate.mako', {
            'param1': 'foo',
            'param2': 'bar'
        })
        mail_utils.sendEmail(to=email, subject='My mail from girder', text=html)

If you wish to send email from within a plugin, simply create a
**server/mail_templates** directory within your plugin, and it will be
automatically added to the mail template search path when your plugin is loaded.
To avoid name collisions, convention dictates that mail templates within your
plugin should be prefixed by your plugin name, e.g.,
``my_plugin.my_template.mako``.

.. note:: All emails are sent as rich text (``text/html`` MIME type).

Logging a Message
^^^^^^^^^^^^^^^^^

Girder application servers maintain an error log and an information log and expose
a utility module for sending events to them. Any 500 error that occurs during
execution of a request will automatically be logged in the error log with a
full stack trace. Also, any 403 error (meaning a user who is logged in but
requests access to a resource that they don't have permission to access) will also be logged
automatically. All log messages automatically include a timestamp, so there
is no need to add your own.

If you want to log your own custom error or info messages outside of those default
behaviors, use the following examples:

.. code-block:: python

    from girder import logger

    try:
        ...
    except:
        # Will log the most recent exception, including a traceback, request URL,
        # and remote IP address. Should only be called from within an exception handler.
        logger.exception('A descriptive message')

    # Will log a message to the info log.
    logger.info('Test')

Adding Automated Tests
^^^^^^^^^^^^^^^^^^^^^^

The server side Python tests are run using
`unittest <https://docs.python.org/2/library/unittest.html>`_. All of the actual
test cases are stored under `tests/cases`.

**Adding to an Existing Test Case**

If you want to add tests to an existing test case, just create a new function
in the relevant TestCase class. The function name must start with **test**. If
the existing test case has **setUp** or **tearDown** methods, be advised that
those methods will be run before and after *each* of the test methods in the
class.

**Creating a New Test Case**

To create an entirely new test case, create a new file in **cases** that ends
with **_test.py**. To start off, put the following code in the module (with
appropriate class name of course):

.. code-block:: python

    from .. import base

    def setUpModule():
        base.startServer()

    def tearDownModule():
        base.stopServer()

    class MyTestCase(base.TestCase):

.. note:: If your test case does not need to communicate with the server, you
   do not need to call **base.startServer()** and **base.stopServer()** in the
   **setUpModule()** and **tearDownModule()** functions. Those functions are called
   once per module rather than once per test method.

Then, in the **MyTestCase** class, just add functions that start with **test**,
and they will automatically be run by unittest.

Finally, you'll need to register your test in the `CMakeLists.txt` file in the
`tests` directory. Just add a line like the ones already there at the bottom.
For example, if the test file you created was called `thing_test.py`, you would
add:

.. code-block:: cmake

    add_python_test(thing)

Re-run CMake in the build directory, and then run CTest, and your test will be
run.

.. note:: By default, **add_python_test** allows the test to be run in parallel
   with other tests, which is normally fine since each python test has its own
   assetstore space and its own mongo database, and the server is typically
   mocked rather than actually binding to its port. However, some tests (such
   as those that actually start the cherrypy server) should not be run concurrently
   with other tests that use the same resource. If you have such a test, use the
   ``RESOURCE_LOCKS`` argument to **add_python_test**. If your test requires the
   cherrypy server to bind to its port, declare that it locks the ``cherrypy``
   resource. If it also makes use of the database, declare that it locks the
   ``mongo`` resource. For example: ::

       add_python_test(my_test RESOURCE_LOCKS cherrypy mongo)