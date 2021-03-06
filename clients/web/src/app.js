girder.App = girder.View.extend({
    initialize: function () {
        girder.fetchCurrentUser()
            .done(_.bind(function (user) {
                girder.eventStream = new girder.EventStream({
                    timeout: girder.sseTimeout || null
                });

                this.headerView = new girder.views.LayoutHeaderView({
                    parentView: this
                });

                this.globalNavView = new girder.views.LayoutGlobalNavView({
                    parentView: this
                });

                this.footerView = new girder.views.LayoutFooterView({
                    parentView: this
                });

                this.progressListView = new girder.views.ProgressListView({
                    eventStream: girder.eventStream,
                    parentView: this
                });

                if (user) {
                    girder.currentUser = new girder.models.UserModel(user);
                    girder.eventStream.open();
                }

                this.layoutRenderMap = {};
                this.layoutRenderMap[girder.Layout.DEFAULT] = this._defaultLayout;
                this.layoutRenderMap[girder.Layout.EMPTY] = this._emptyLayout;
                this.render();

                // Once we've rendered the layout, we can start up the routing.
                Backbone.history.start({
                    pushState: false
                });
            }, this));

        girder.events.on('g:navigateTo', this.navigateTo, this);
        girder.events.on('g:loginUi', this.loginDialog, this);
        girder.events.on('g:registerUi', this.registerDialog, this);
        girder.events.on('g:resetPasswordUi', this.resetPasswordDialog, this);
        girder.events.on('g:alert', this.alert, this);
        girder.events.on('g:login', this.login, this);
    },

    _defaultLayout: {
        show: function () {
            this.$('#g-app-header-container,#g-global-nav-container,#g-app-footer-container').show();
            this.$('#g-app-body-container').addClass('g-default-layout');
        },

        hide: function () {
            this.$('#g-app-header-container,#g-global-nav-container,#g-app-footer-container').hide();
            this.$('#g-app-body-container').removeClass('g-default-layout');
        }
    },

    _emptyLayout: {
        show: function () {
            this.$('#g-app-body-container').addClass('g-empty-layout');
        },

        hide: function () {
            this.$('#g-app-body-container').removeClass('g-empty-layout');
        }
    },

    render: function () {
        this.$el.html(girder.templates.layout());

        this.globalNavView.setElement(this.$('#g-global-nav-container')).render();
        this.headerView.setElement(this.$('#g-app-header-container')).render();
        this.footerView.setElement(this.$('#g-app-footer-container')).render();
        this.progressListView.setElement(this.$('#g-app-progress-container')).render();

        return this;
    },

    /**
     * Changes the current body view to the view class specified by view.
     * @param view The view to display in the body.
     * @param [settings={}] Settings to pass to the view initialize() method.
     * @param opts Additional options for navigateTo, if any.
     */
    navigateTo: function (view, settings, opts) {
        this.globalNavView.deactivateAll();

        settings = settings || {};
        opts = opts || {};

        if (opts.layout) {
            if (girder.layout !== opts.layout) {
                if (_.has(this.layoutRenderMap, opts.layout)) {
                    // set a layout if opts specifies one different from current
                    this.layoutRenderMap[girder.layout].hide.call(this, opts);
                    girder.layout = opts.layout;
                    this.layoutRenderMap[girder.layout].show.call(this, opts);
                } else {
                    console.error('Attempting to set unknown layout type: ' + opts.layout);
                }
            }
        } else if (girder.layout !== girder.Layout.DEFAULT) {
            // reset to default as needed when nothing specified in opts
            this.layoutRenderMap[girder.layout].hide.call(this, opts);
            girder.layout = girder.Layout.DEFAULT;
            this.layoutRenderMap[girder.layout].show.call(this, opts);
        }

        if (view) {
            if (this.bodyView) {
                this.bodyView.destroy();
            }

            settings = _.extend(settings, {
                el: this.$('#g-app-body-container'),
                parentView: this
            });

            /* We let the view be created in this way even though it is
             * normally against convention.
             */
            this.bodyView = new view(settings); // eslint-disable-line new-cap
        } else {
            console.error('Undefined page.');
        }
        return this;
    },

    /**
     * Close any open dialog if we are already logged in.
     * :returns: true if we have a current user.
     */
    closeDialogIfUser: function () {
        if (girder.currentUser) {
            $('.modal').girderModal('close');
            return true;
        }
        return false;
    },

    /**
     * Show a dialog allowing a user to login or register.
     */
    loginDialog: function () {
        if (this.closeDialogIfUser()) {
            return;
        }
        if (!this.loginView) {
            this.loginView = new girder.views.LoginView({
                el: this.$('#g-dialog-container'),
                parentView: this
            });
        }
        this.loginView.render();
    },

    registerDialog: function () {
        if (this.closeDialogIfUser()) {
            return;
        }
        if (!this.registerView) {
            this.registerView = new girder.views.RegisterView({
                el: this.$('#g-dialog-container'),
                parentView: this
            });
        }
        this.registerView.render();
    },

    resetPasswordDialog: function () {
        if (this.closeDialogIfUser()) {
            return;
        }
        if (!this.resetPasswordView) {
            this.resetPasswordView = new girder.views.ResetPasswordView({
                el: this.$('#g-dialog-container'),
                parentView: this
            });
        }
        this.resetPasswordView.render();
    },

    /**
     * Display a brief alert on the screen with the following options:
     *   - text: The text to be displayed
     *   - [type]: The alert class ('info', 'warning', 'success', 'danger').
     *             Default is 'info'.
     *   - [icon]: An optional icon to display in the alert.
     *   - [timeout]: How long before the alert should automatically disappear.
     *                Default is 6000ms. Set to <= 0 to have no timeout.
     */
    alert: function (options) {
        var el = $(girder.templates.alert({
            text: options.text,
            type: options.type || 'info',
            icon: options.icon
        }));
        $('#g-alerts-container').append(el);
        el.fadeIn(500);

        if (options.timeout === undefined) {
            options.timeout = 6000;
        }
        if (options.timeout > 0) {
            window.setTimeout(function () {
                el.fadeOut(750, function () {
                    $(this).remove();
                });
            }, options.timeout);
        }
    },

    /**
     * On login we re-render the current body view; whereas on
     * logout, we redirect to the front page.
     */
    login: function () {
        var route = girder.dialogs.splitRoute(Backbone.history.fragment).base;
        Backbone.history.fragment = null;
        girder.eventStream.close();

        if (girder.currentUser) {
            girder.eventStream.open();
            girder.router.navigate(route, {trigger: true});
        } else {
            girder.router.navigate('/', {trigger: true});
        }
    }
});
