// Write your package code here!
var newVersionAvailable = new ReactiveVar(0);
var hasResume = new ReactiveVar(false);
var myRetry = null;

var onReloadTemplate = null;


var tag = '[SmartReload]';

SmartReload = {
    _options: {
        reload : {
            firstStart : false,
            selector: false,
            router: false
        }
    },
    routes: {},
    configure: function(options) {
        if(!_.isObject(options)) throw new Meteor.Error(tag, 'Options Was Not An Object');
        _.extend(this._options, options);
    }
};

Reload._onMigrate('smartReload', onMigrate);

function retry(thisRetry) {
    Reload._onResume ? Reload._onResume(thisRetry) : thisRetry();
    thisRetry = null
}

function isOnReloadTemplate() {
    var route = Router.current() && Router.current().route.getName();
    if(!route) return;

    console.log("Checking for reload template", route, !_.has(SmartReload.routes, route));
    onReloadTemplate = !_.has(SmartReload.routes, route);

    if(myRetry && onReloadTemplate) {
        retry(myRetry);
    }
}

function onMigrate(retry) {
    newVersionAvailable.set(newVersionAvailable.get()+1);

    var firstStart = localStorage.getItem('l_mirrorcell:firstStart');


    //This means the app is completely fresh, we want to reload immediately
    if(SmartReload._options.reload.firstStart && !firstStart) {
        console.log("FRESH START");
        localStorage.setItem('l_mirrorcell:firstStart', 'done');
        return Reload._onResume ? Reload._onResume() : [true, {}];
    } else {
        console.log("NON FRESH START");

        //return Reload._onResume ? Reload._onResume() : [true, {}];
        //if router method is excluded
        if(SmartReload._options.reload.router && !onReloadTemplate) {
            myRetry = retry;
            return [false];
        }

        /*if(SmartReload._options.reload.selector){

        }*/

        return Reload._onResume ? Reload._onResume() : [true, {}];


    }
}

//Track Any Kind Of Template Render
Meteor.startup(function(){
    for(var property in Template){
        // check if the property is actually a blaze template
        if(Blaze.isTemplate(Template[property])){
            var template=Template[property];
            // assign the template an onRendered callback who simply prints the view name
            template.onCreated(function(){
                isOnReloadTemplate();
            });
        }
    }
});

/*
Reload.hasResumed = function () {
    return hasResumed.get();
};

Reload.isWaitingForResume = function () {
    return newVersionAvailable.get();
};*/