## Smart Reload Alpha Build! A Plugin Allows You to control when auto updates gets pushed out to your clients. ##

##### REQUIREMENTS: IRON:ROUTER #####

What does Smart Reload Do For You?

Smart Reload attempts to solve the problem of annoying mid-page auto updates from the server, while still keeping your clients updated with your latest code. Its highly customizable so you choose exactly when you want your clients to update, all without the clients needing to do anything. This is most important on mobile devices, where your app store app might be much farther behind where the latest version of the updated app is at.

## Features: ##
- Force update on First Start of App (Ensures that the application will start with the most up to date code possible)
- Wait To Update if a certain Selector is present in the app (forms, inputs, etc ... stuff you dont want to refresh while your user is entering information)
- Wait To Update if a user is on a certain Page (If a user is on a blacklisted page, it will wait till they navigate to a non blacklisted page to update)
- Wait To Update Till The User is Idle ( x number of seconds without interacting with the app)

Or All of the above, they can all be used in conjunction with one another.


### Configuration -- Full List Of Options and their defaults ###

````javascript
SmartReload.configure({
        reload: {
            firstStart: false,
            router: false,
            idle: false,
            selector: false
        },
        idleTracker: {
            detectorMs: 1000,
            idleThreshold: 10,
            inactiveThreshold: 20,
            disconnectInactive: false
        },
        debug: true,
        splashScreen: false, // MOBILE ONLY
        splashScreenTimeout: 2000, // MOBILE ONLY
        splashWaitOnLayout: 'layout', // MOBILE ONLY        
    });
````

##Reload Options -- ##

### First Start (firstStart) -- ###
If you enable this option, no matter what other settings you enable, your app will get forcefully updated to the newest version the first time it is started by the client. This is especially important for mobile-apps. 

### Router (router) --- ###
if you enable router blacklisting, you can add routes to SmartReload.routes that you do not want to update. Ex:
    ````javascript
    SmartReload.routes = {
    	pathToRoute : true
    };
    `````
Means that if the client is on the route 'pathToRoute' if there is an update while on that route, it will wait till the user navs to a page that isnt blacklisted to update the application.
    
### Selector (selector) --- ###
The same as router, except for selectors. Ex. If you add the selector '.item' to SmartReload.selectors any page with an '.item' will not reload until you nav onto a page without an '.item' class in the dom.
    
### Idle (idle) --- ###
If enabled, this will disallow the client app from refreshing until a client becomes inactive (x number of seconds pass while a user hasnt interacted with the app/ webpage). This allows you to sneakily update while clients are inactive / away. Thanks to the IdleWatcher package on atmosphere. 
    
MOBILE EXTRA: If you enable the idle option, you can also enable a splash screen to display while the app is hot code pushing / updating. Highly recommend you enable this if your working with a cordova / mobile app as it seamlessly transitions without the flashing UI you get normally when you hot code. CORDOVA ONLY.


Demo coming soon....









