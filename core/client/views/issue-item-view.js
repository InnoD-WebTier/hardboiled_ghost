import itemView from 'ghost/views/item-view';

var IssueItemView = itemView.extend({
    doubleClick: function () {
        this.get('controller').send('openIssueEditor');
    },

    click: function () {
        this.get('controller').send('showIssueContent');
    }
});

export default IssueItemView;
