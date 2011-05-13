/**
 * @(#)adder.js
 *
 * Copyright (c) vsgvsg@gmail.com
 *
 * Remote Adder for µTorrent WebUI.
 *
 * Adds a menu item to the Chrome context menu for links.
 * On menu click downloads a file at link's URL and immediately uploads it to
 * the remote instance of µTorrent via WebUI API.
 */
var adder = function() {

    // WebUI secure token
    var token = null;

    // verifies that this extension is properly configured
    var checkConfig = function() {
        if (typeof(localStorage.host) == 'undefined') {
            alert("You need to provide login information first.\n\n" +
                "Please go to  Tools | Extensions | uTorrent Remote Adder | Options to configure this extension.");
            return false;
        }

        return true;
    };

    // returns true if user selected Display Confirmation option
    var showConfirmation = function() {
        return  localStorage["confirmation"] == "true";
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
            alert("Error connecting to uTorrent WebUI");
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
        return eval("(" + xhr.responseText + ")");
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
            response = eval("(" + responseText + ")");
        } catch(err) {
            alert("Unexpected error while adding torrent");
        }
        if (response.error) {
            alert("Error adding torrent!\n\n" + response.error);
        } else if (showConfirmation()) {

            // get the name of the last torrent in the list
            var list = getTorrentsList();
            var torrents = list.torrentp || list.torrents;
            if (torrents) {
                var torrent = torrents[torrents.length - 1];
                alert("Torrent added: \n\n" + torrent[2]);
            }
        }
    };

    // downloads file at specified url
    var downloadFile = function(url, callback) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.responseType = 'arraybuffer';

        xhr.onload = function() {
            var blob = new WebKitBlobBuilder();
            blob.append(xhr.response);

            callback(blob.getBlob());
        };

        xhr.send(null);
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

            downloadFile(info.linkUrl, uploadTorrent);

            return true;
        }
    };
}();

// adds 'Add to uTorrent' menu item to the context menu
chrome.contextMenus.create({
    "title": "Add to \u00B5Torrent",
    "contexts":["link"],
    "onclick": adder.addTorrent
});
