/**
 * @(#)adder.js
 *
 * Copyright (c) vsgvsg@gmail.com
 */
var adder = function() {

    // WebUI secure token
    var token = null;

    // verifies that this extension is properly configured
    var checkConfig = function() {
        if (typeof(localStorage.host) == "undefined") {
            alert("You need to provide login information first.\n\n" +
                "Please go to  Tools | Extensions | uTorrent Remote Adder | Options to configure this extension.");
            return false;
        }

        return true;
    };

    // returns true only if user never unselected Display Notifications option
    var showConfirmation = function() {
        return  localStorage["notifications"] != "false";
    };

    // returns WebUI login url
    var getLoginUrl = function() {
        var protocol = (localStorage["https"] == "true") ? "https://" : "http://";
        var host = localStorage["host"];
        var port = localStorage["port"];
        var username = localStorage["username"];
        var password = localStorage["password"];

        return  protocol + username + ":" + encodeURIComponent(password) + "@" + host + ":" + port;
    };

    // returns authenticated WebUI url with secure token
    var getAuthUrl = function() {
        var protocol = (localStorage["https"] == "true") ? "https://" : "http://";
        var host = localStorage["host"];
        var port = localStorage["port"];
        var username = localStorage["username"];
        var password = localStorage["password"];

        return  protocol + host + ":" + port + "/gui/?token=" + token;
    };

    // retrieves WebUI secure token
    var getToken = function() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", getLoginUrl() + "/gui/token.html", false);
            xhr.send(null);
        } catch(e) {
            displayError("Error connecting to \u00B5Torrent WebUI");
            return null;
        }

        // extract token from html response
        var reg = new RegExp("<div.*>(.*?)</div>");
        var matches = reg.exec(xhr.responseText);

        return matches[1];
    };

    //  retrieves a list of all torrents currently processed by uTorrent
    var getTorrentsList = function(cacheId) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", getAuthUrl() + "&list=1" + (cacheId ? ("&cid=" + cacheId) : ""), false);
            xhr.send(null);
        } catch(e) {
            return null;
        }

        // convert response to an object
        return JSON.parse(xhr.responseText);
    };


    // uploads torrent file to uTorrent
    var uploadTorrent = function(file) {

        // prepare torrent file
        var formdata = new FormData();
        formdata.append("torrent_file", file);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", getAuthUrl() + "&action=add-file", true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                handleResponse(xhr.responseText);
            }
        };

        // upload it
        xhr.send(formdata);
    };

    // displays error or confirmation message
    var handleResponse = function(responseText) {
        // check for errors
        var response = null;
        try {
            response = JSON.parse(responseText);
        } catch(err) {
            displayError("Unexpected error while adding torrent: " + err.toString());
        }
        if (response.error) {
            displayError("Error: " + response.error);
        } else if (showConfirmation()) {

            // get the name of the last torrent in the list
            var list = getTorrentsList();
            var torrents = list.torrentp || list.torrents;
            if (torrents) {
                var torrent = torrents[torrents.length - 1];
                displayMessage("Torrent added: " + torrent[2]);
            }
        }
    };

    // downloads file at specified url
    var downloadFile = function(url, callback) {
        var xhr = new XMLHttpRequest();

        var filename = url.substring(url.lastIndexOf("/") + 1);
        displayMessage("Downloading " + filename + "...");

        xhr.open("GET", url, true);
        xhr.overrideMimeType("text/plain; charset=x-user-defined");
        xhr.responseType = "arraybuffer";

        xhr.onload = function() {
            var blob = new WebKitBlobBuilder();
            blob.append(xhr.response);

            displayMessage("Sending " + filename + " to \u00B5Torrent...");
            callback(blob.getBlob());
        };

        xhr.send(null);
    };

    // sends notification message to notification script
    var displayMessage = function(msg) {
        // send notification msg
        if (showConfirmation()) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendRequest(tab.id, {greeting: "utaNotification", msg: msg});
            });
        }
    };

    // sends error message to notification script
    var displayError = function(msg) {
        // send notification msg
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendRequest(tab.id, {greeting: "utaNotification", msg: msg});
        });
    };

    // sends hide notification bar message to notification script
    var hideMessages = function() {
        // send notification msg
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendRequest(tab.id, {greeting: "utaHide"});
        });
    };

    // public interface
    return {

        // adds torrent to the remote uTorrent server
        addTorrent : function(info) {

            if (!checkConfig()) {
                return false;
            }

            // request security token first
            token = getToken();
            if (!token) {
                return false;
            }
            try {
                displayMessage("Connected to \u00B5Torrent...");

                downloadFile(info.linkUrl, uploadTorrent);
            } finally {
                if (localStorage["autohide"] == "true") {
                    hideMessages();
                }
            }

            return true;
        }
    };
}();

// add 'Add to uTorrent' menu item to the context menu
chrome.contextMenus.create({
    "title": "Add to \u00B5Torrent",
    "contexts":["link"],
    "onclick": adder.addTorrent
});


