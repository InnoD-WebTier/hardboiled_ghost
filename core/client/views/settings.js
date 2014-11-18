import MobileParentView from 'ghost/views/mobile/parent-view';

var SettingsView = MobileParentView.extend({
    // MobileParentView callbacks
    showMenu: function () {
        $('.js-settings-header-inner').css('display', 'none');
        $('.js-settings-menu').css({right: '0', left: '0', 'margin-right': '0'});
        $('.js-settings-content').css({right: '-100%', left: '100%', 'margin-left': '15'});

        // TODO: HACK
        $('.js-settings-users').css({left: '100%', top: '95px'});
    },
    showContent: function () {
        $('.js-settings-menu').css({right: '100%', left: '-110%', 'margin-right': '15px'});
        $('.js-settings-content').css({right: '0', left: '0', 'margin-left': '0'});
        $('.js-settings-header-inner').css('display', 'block');

        // TODO: HACK
        $('.js-settings-users').css({left: '0', top: '0'});
    },
    showAll: function () {
        $('.js-settings-menu, .js-settings-content').removeAttr('style');

        // TODO: HACK
        $('.js-settings-users').removeAttr('style');
    }
});

export default SettingsView;
