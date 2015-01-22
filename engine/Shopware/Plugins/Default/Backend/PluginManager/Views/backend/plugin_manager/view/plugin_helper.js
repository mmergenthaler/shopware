
//{namespace name=backend/plugin_manager/translation}
Ext.define('Shopware.apps.PluginManager.view.PluginHelper', {

    displayPluginEvent: function(record) {
        Shopware.app.Application.fireEvent(
            'display-plugin',
            record
        );
    },

    downloadFreePluginEvent: function(record, price) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'download-free-plugin',
            record,
            price,
            function() {
                me.fireReloadEvent(record);
            }
        );
    },

    buyPluginEvent: function(record, price) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'buy-plugin',
            record,
            price,
            function() {
                me.fireReloadEvent(record);
            }
        );
    },

    rentPluginEvent: function(record, price) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'rent-plugin',
            record,
            price,
            function() {
                me.fireReloadEvent(record);
            }
        );
    },

    pluginBoughtEvent: function(record) {
        var me = this;

        var event = 'plugin-bought-' + record.get('technicalName');

        Shopware.app.Application.fireEvent(
            event,
            record
        );
    },

    updateDummyPluginEvent: function(record) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'update-dummy-plugin',
            record,
            function() {
                me.firePluginEvent('install-plugin', record);
            }
        );
    },

    updatePluginEvent: function(record) {
        this.firePluginEvent('update-plugin', record, function() {
            Shopware.app.Application.fireEvent('load-update-listing');
        });
    },

    installPluginEvent: function(record) {
        this.firePluginEvent('install-plugin', record);
    },

    uninstallPluginEvent: function(record) {
        this.firePluginEvent('uninstall-plugin', record);
    },

    reinstallPluginEvent: function(record) {
        this.firePluginEvent('reinstall-plugin', record);
    },

    activatePluginEvent: function(record) {
        this.firePluginEvent('activate-plugin', record);
    },

    deactivatePluginEvent: function(record) {
        this.firePluginEvent('deactivate-plugin', record);
    },

    deletePluginEvent: function(record) {
        var me = this;

        Shopware.app.Application.fireEvent('delete-plugin', record, function() {
            me.removeLocalData(record);
            var event = 'plugin-reloaded-' + record.get('technicalName');

            Shopware.app.Application.fireEvent(event, record);
            Shopware.app.Application.fireEvent('plugin-reloaded', record);
        });
    },

    requestPluginTestVersionEvent: function(record, price) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'request-plugin-test-version',
            record,
            price,
            function() {
                me.fireReloadEvent(record);
            }
        );
    },

    reloadPlugin: function(plugin, callback) {
        var me = this;

        plugin.reload({
            callback: function(updated) {
                var merged = me.mergePlugin(plugin, updated.data);
                var event = 'plugin-reloaded-' + plugin.get('technicalName');

                Shopware.app.Application.fireEvent(event, merged);

                Shopware.app.Application.fireEvent('plugin-reloaded', merged);

                if (Ext.isFunction(callback)) {
                    callback();
                }
            }
        });
    },

    mergePlugin: function(plugin, data) {
        var whiteList = [
            'active', 'installationDate', 'version',
            'capabilityInstall', 'capabilityUpdate',
            'capabilityActivate', 'id', 'formId', 'localIcon'
        ];

        Ext.each(whiteList, function(property) {
            if (data.hasOwnProperty(property)) {
                plugin.set(property, data[property]);
            }
        });

        plugin.set('groupingState', null);

        return plugin;
    },

    removeLocalData: function(record) {
        record.set('id', null);
        record.set('active', false);
        record.set('version', null);
        record.set('capabilityInstall', false);
        record.set('capabilityUpdate', false);
        record.set('capabilityActivate', false);
        record.set('formId', false);
        record.set('localIcon', false);
    },

    fireRefreshAccountData: function(response) {
        Shopware.app.Application.fireEvent(
            'refresh-account-data',
            response
        );
    },

    firePluginEvent: function(event, record, callback) {
        var me = this;

        Shopware.app.Application.fireEvent(
            event,
            record,
            function() {
                me.fireReloadEvent(record, callback);
            }
        );
    },

    fireReloadEvent: function(record, callback) {
        var me = this;

        Shopware.app.Application.fireEvent(
            'reload-plugin',
            record,
            callback
        );
    },

    sendAjaxRequest: function(url, params, callback) {
        var me = this;

        Ext.Ajax.request({
            url: url,
            method: 'POST',
            params: params,
            success: function(operation, opts) {
                var response = Ext.decode(operation.responseText);

                if (response.success === false) {
                    me.displayErrorMessage(response);
                    me.hideLoadingMask();
                    return;
                }

                callback(response);
            }
        });
    },

    displayLoadingMask: function(plugin, description) {
        var me = this;

        me.hideLoadingMask();

        Shopware.app.Application.loadingMask = Ext.create('Shopware.apps.PluginManager.view.loading.Mask', {
            plugin: plugin,
            description: description
        });

        Ext.Function.defer(function(deferPlugin) {
            if (!Shopware.app.Application.loadingMask) {
                return;
            }

            var loadingPlugin = Shopware.app.Application.loadingMask.plugin;
            if (loadingPlugin.get('technicalName') !== deferPlugin.get('technicalName')) {
                return;
            }

            me.hideLoadingMask();

        }, 15000, this, [plugin]);

        Shopware.app.Application.loadingMask.show();
    },

    hideLoadingMask: function() {
        if (Shopware.app.Application.loadingMask) {
            Shopware.app.Application.loadingMask.destroy();
        }
    },

    confirmMessage: function(title, message, callback, declineCallback) {
        var me = this;

        Ext.MessageBox.confirm(title, message, function (apply) {
            if (apply !== 'yes') {
                me.hideLoadingMask();

                if (Ext.isFunction(declineCallback)) {
                     declineCallback();
                }

                return;
            }
            callback();
        });
    },

    displayErrorMessage: function(response) {
        var message = response.message;

        Shopware.Notification.createStickyGrowlMessage({
            title: 'Error',
            text: message,
            width: 350
        });

        if (response.hasOwnProperty('authentication') && response.authentication) {
            Shopware.app.Application.fireEvent('open-login', function() { });
        }

        this.hideLoadingMask();
    },

    getPriceByType: function(prices, type) {
        var me = this, price = null;

        prices.each(function(item) {
            if (item.get('type') == type) {
                price = item;
            }
        });
        return price;
    },

    formatDate: function(date) {
        var value = date.replace(' ', 'T');

        value += '+00:00';
        value = new Date(value);
        value = new Date((value.getTime() + (value.getTimezoneOffset() * 60 * 1000)));

        return value;
    },

    getTextForPriceType: function(type) {
        if (type == 'buy') {
            return '{s name="buy_version"}{/s}';
        }

        if (type == 'rent') {
            return '{s name="rent_version"}{/s}';
        }

        if (type == 'test') {
            return '{s name="test_version"}{/s}'
        }

        if (type == 'free') {
            return '{s name="free_version"}{/s}';
        }

        return null;
    }
});