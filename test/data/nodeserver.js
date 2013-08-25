var http = require('http');
var url = require('url');

http.createServer(function (req, res) {    
    var id_prefix = "";
    var parent_id = ""; 

    // Parse query for parent
    var url_parts = url.parse(req.url, true, true);
    var query = url_parts.query; 
    if (query != undefined && query.hasOwnProperty('parent')){
        parent_id = query.parent; 
    }

    // Test range from 0 to 10,000
    var start = 0, total = 10000, end = 40;

    // Get header range value
    var range;
    if (req.headers.hasOwnProperty('range')){
        range = req.headers['range'];
    } else if (req.headers.hasOwnProperty('http-x-range')){
        range = req.headers['http-x-range'];
    }    
    if (typeof range !== 'undefined'){ 
        //Parse range  
        var result = range.match('([0-9]+)-([0-9]+)')
        start = parseInt(result[1], 10);
        end = parseInt(result[2], 10);
        if (end > total){
            end = total;
        }
    }

    // Create response header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, X-Range, X-Requested-With'); 
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range'); 
    res.writeHead(200, {'Content-Type': 'application/json',
                        'Content-Range': 'items '+ start + '-' + end +'/' + total });

    // Construct rows expected by dgrid
    var resultJSON = '[';
    for (var i = start; i <= end; ++i){
        if (i != start){
            resultJSON = resultJSON + ',';
        }
        if (parent_id !== ""){
            id_prefix = parent_id + "-";
            resultJSON = resultJSON + '{"id":"' + id_prefix + i +'","name":"Child Item '+ i +'","comment":"hello",parent:'+ parent_id +'}';
        } else {
            resultJSON = resultJSON + '{"id":' + i +',"name":"Item '+ i +'","comment":"hello"}';
        }              
    }
    resultJSON = resultJSON + ']'; 
    res.end(resultJSON);

}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');