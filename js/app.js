
    // Some global variables
    
    var snapshot_list = new Object();
    var firebase_list = [];
    var graph_drawn_list= new Object();


    var urlParams, start_query, end_query, start_date, end_date, date, duration, days, days_list, graph_list;




$( document ).ready(function() {

    // Configure Firebase
    var config = {
        apiKey: "AIzaSyDUZuQpTraWoYFjCFSGUO0gQ950MZLChFQ",
        authDomain: "ntnu-air.firebaseapp.com",
        databaseURL: "https://ntnu-air.firebaseio.com",
        projectId: "ntnu-air",
        storageBucket: "ntnu-air.appspot.com",
        messagingSenderId: "678328250183"
    };


    // Read the urlParams for a time frame
    
    urlParams = new URLSearchParams(window.location.search);
    start_query =  moment(urlParams.get('start'));
    end_query = moment(urlParams.get('end'));

    start_date = moment();
    end_date = moment();

    // Validate the time frame

    if (start_query.isValid() &&!start_query.isAfter()) { start_date=start_query;} 
    if (end_query.isValid()   &&!end_query.isAfter()) { end_date=end_query;}
    if (start_date.isBefore("2018-12-07")) { start_date = moment("2018-12-07");}

    if (end_date.isBefore(start_date)){ end_date=start_date; }

    date = start_date;

    duration = moment.duration(end_date.diff(start_date));
    //console.log("duration ",duration.asDays());
    days = duration.asDays();
    days_list = [];



    // List the days to retrive from firebase
    for (var i = 0; i <= days; i++) {
        //console.log("dateFormat",date.format("YYYY-MM-DD"));
        days_list.push(date.format("YYYY-MM-DD"));
        date.add(1, 'd');        
    }

    // Initialize Firebase
    firebase.initializeApp(config);

    // Initialize the filter
    var elem = document.getElementById('filterArea');

    function f(){
        var v = elem.value;
        //console.log(v);
    
        $(".room_container").each(function( index ) {
            $( this ).hide();
            var id= $( this ).attr('id');

            if (id.indexOf(v) >= 0){ $( this ).show(); }
        });
    }
    
    //elem.onchange = f;
    elem.onkeyup = f;
    elem.onkeydown = f;

    
    



    // Create an object for each day retrived from the database that will update the graph as it gets more data

    for (var i = 0; i < days_list.length; i++) {

        //console.log(days_list[i])
        firebase_list.push( firebase.database().ref('server/room_data/'+ days_list[i]));
        //console.log("firebase_list",firebase_list);

        firebase_list[i].on('value', function(snapshot) {
            if (snapshot.val()) { snapshot_list[snapshot.key]=snapshot.val(); }
            var room_list = updateRoomList(snapshot_list);

            graph_list = updateGraphList(room_list);
            
            updateGraph(graph_list);
        });
    }

});

function updateRoomList(snap_list){

    // Merges the data for the same room acreoss multiple days 
    
    var room_list = new Object();
    $.each( snap_list, function( key,val) {
    //console.log(key,val);
        $.each( val, function( key,val) {
        //console.log(key);
            if (!room_list[key]) {room_list[key]=new Object();}
            $.extend(room_list[key], val);});
        });
    //console.log("room_list",room_list);
    return room_list;
}
    
function updateGraphList(room_list){

    // Reformat the data with a timestamp to be fed in to graph.js

    var graph_list = new Object();
    var graph_list_short = new Object();
    //console.log("room_list",room_list);
        
    $.each( room_list, function( room_name ,room) {

        graph_list[room_name]= {
            "room_battery_v_list": [],
            "room_dust_list": [],
            "room_humidity_prc_list": [],
            "room_oxigen_prc_list": [],
            "room_pressure_hpa_list": [],
            "room_id":"",
            "room_temp_c_list": []                 
        };
        i=0;
        step = Math.round(days)
        if (step <1){step=1};

        $.each( room, function( data_point_name,val) {
            var timeX = moment.unix((val["u_time"]));
            //console.log(timeX.format("YYYY-MM-DD"))
            i++;
        
            if (i==step) {
                i=0;

                graph_list[room_name]["room_battery_v_list"].push( {x:timeX,y:val["battery_v"]});
                graph_list[room_name]["room_dust_list"].push( {x:timeX,y:val["dust"]});
                graph_list[room_name]["room_humidity_prc_list"].push( {x:timeX,y: val["humidity_prc"]});
                graph_list[room_name]["room_oxigen_prc_list"].push( {x:timeX,y: val["oxigen_prc"]});
                graph_list[room_name]["room_pressure_hpa_list"].push( {x:timeX,y: val["pressure_hpa"]});
                graph_list[room_name]["room_id"]= val["room_id"];
                graph_list[room_name]["room_temp_c_list"].push( {x:timeX,y: val["temp_c"]});
            }

        });
    });

    //console.log("graph_list",graph_list);
    return graph_list;
}




function updateGraph(graph_list){

    //Draw and then updates the graph.js objects 
    //console.log("graph_drawn_list",graph_drawn_list);

    $.each( graph_list, function( room_name,room_data) {
        //console.log("room_data",room_data);
       

        if (!$('#'+room_name).length){


            $('<div/>', {
            id: room_name,
            class: 'room_container',
            title: room_name
            }).appendTo('#mainCont').append($("<h3></h3>").append(room_name));
            graph_drawn_list[room_name]= new Object();

            console.log( "ox",room_data["room_oxigen_prc_list"])

            graph_drawn_list[room_name]["o_t"] = makeGenericChart( room_name, room_data["room_oxigen_prc_list"], room_data["room_temp_c_list"], 'Oxigen %', "Temperature c", 50, 50 );

            graph_drawn_list[room_name]["o_d"] = makeGenericChart( room_name, room_data["room_oxigen_prc_list"], room_data["room_dust_list"], 'Oxigen %', "Dust", 50, 1000 );

            graph_drawn_list[room_name]["h_p"] = makeGenericChart( room_name, room_data["room_humidity_prc_list"], room_data["room_pressure_hpa_list"], 'Humidity %', "Pressure hpa", 100, 1000 );

            graph_drawn_list[room_name]["b_t"] = makeGenericChart( room_name, room_data["room_battery_v_list"], room_data["room_temp_c_list"], 'Battery v', "Temperature c", 5, 50 );





   

            

        }
        else{

            graph_drawn_list[room_name]["o_t"].config.data.datasets[0].data= room_data["room_oxigen_prc_list"];
            graph_drawn_list[room_name]["o_t"].config.data.datasets[1].data = room_data["room_temp_c_list"];
            graph_drawn_list[room_name]["o_t"].update(0);
            

            graph_drawn_list[room_name]["o_d"].config.data.datasets[0].data= room_data["room_oxigen_prc_list"];
            graph_drawn_list[room_name]["o_d"].config.data.datasets[1].data = room_data["room_dust_list"];
            graph_drawn_list[room_name]["o_d"].update(0);

            graph_drawn_list[room_name]["h_p"].config.data.datasets[0].data= room_data["room_humidity_prc_list"];
            graph_drawn_list[room_name]["h_p"].config.data.datasets[1].data = room_data["room_pressure_hpa_list"];
            graph_drawn_list[room_name]["h_p"].update(0);

            graph_drawn_list[room_name]["b_t"].config.data.datasets[0].data= room_data["room_battery_v_list"];
            graph_drawn_list[room_name]["b_t"].config.data.datasets[1].data = room_data["room_temp_c_list"];
            graph_drawn_list[room_name]["b_t"].update(0);

  
        }
    });
}




function makeGenericChart(room, data1, data2, label1, label2, max1, max2 ){
    $chartContainer=$('<div/>', {
        class: 'chart_container',
    }).appendTo('#'+room);


    $chartContainer.click(function() {
    $(this).toggleClass("zoom");
    for (var id in Chart.instances) {
      Chart.instances[id].resize()
  }
     
            






    });


    $graphCanvas = $('<canvas/>', {
        class: 'graph_canvas',
    }).appendTo($chartContainer);
       
    var ctx =  $graphCanvas[0].getContext('2d');

    var myChart = new Chart(ctx, {
        type: 'line',
        data: { 
            datasets: [{
              label: label1,
              data: data1,
              borderColor: "rgba(124,0,0,0.2)",
              fill:false,
              yAxisID: 'y-axis-1'
            }, {
              label: label2,
              data:  data2,
              borderColor: "rgba(0,0,124,0.2)",
              fill:false,
              yAxisID: 'y-axis-2'
            }]
        },


        options: {
            elements: {
                line: { tension: 0,
                    borderWidth:2
                },
                point: { radius: 0.1,
                    hitRadius:5,
                    backgroundColor:'rgba(0,0,0,1)',  
                    borderColor:'rgba(0,0,0,0.0)' }
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                                unit: 'hour',
                                unitStepSize: 1*Math.round(days),
                                displayFormats: {
                                'hour': 'MMM D hh:mm'
                                }
                            }
                }],
                
                yAxes: [{
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                    display: true,
                    position: 'left',
                    id: 'y-axis-1',
                    ticks: {suggestedMin: 0, suggestedMax: max1 }
                }, {
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                    display: true,
                    position: 'right',
                    id: 'y-axis-2',
                    ticks: { suggestedMin: 0, suggestedMax: max2 },
                    gridLines: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                }],
                responsive: true,
                hoverMode: 'index',
                stacked: false,
                title: { display: true, text: room},

            }
        }
    });
    return myChart; 
}

