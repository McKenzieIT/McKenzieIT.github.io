$(document).ready(function() {
    //定义svg变量将布局svg1选出来 
    var svg = d3.select("#svg1"), 
        width = svg.attr("width"), 
        height = svg.attr("height");

    //定义name变量制作图标
    var names = ['HE Provider', 'Region', 'Country'];
    var colors = ['#1e699b', '#22b98c', '#c94001'];

    //背景颜色设置 补充CSS样式设置字体布局
    for (var i=0; i < names.length; i++) {
        $('#indicator').append("<div><span style='background-color:" + colors[i] + "'></span>" + names[i] + "</div>");
    }

    //利用d3.forceSimulation()定义关系图 包括设置边link、排斥电荷charge、关系图中心点
    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    //存储关系图的数据
    var graph;

    //定义d3.json请求python处理好的节点及边 请求成功返回数据，否则报错
    d3.json("opendata_alldata.json", function(error, data) {
        if(error) throw error;
        graph = data;
        console.log(graph);

        //D3映射数据至HTML中
        //g用于绘制所有边,selectALL选中所有的line,并绑定数据data(graph.links),enter().append("line")添加元素
        //数据驱动文档,设置边的粗细
        //前面定义var svg = d3.select("#svg1")
        var link = svg.append("g").attr("class","links").selectAll("line").data(graph.links)
        .enter().append("line").attr("stroke-width", function(d) {
            //return Math.sqrt(d.value);
            return 1; //所有线宽度均为1
        });

        //添加所有的点
        //selectAll("circle")选中所有的圆并绑定数据,圆的直径为d.size
        //再定义圆的填充色,同样数据驱动样式,圆没有描边,圆的名字为d.id
        //call()函数：拖动函数,当拖动开始绑定dragstarted函数，拖动进行和拖动结束也绑定函数
        var node = svg.append("g").attr("class", "nodes").selectAll("circle").data(graph.nodes)
        .enter().append("circle").attr("r", function(d) {
            return d.size;
        }).attr("fill", function(d) {
            return colors[d.group];
        }).attr("stroke", "none").attr("name", function(d) {
            return d.id;
        }).call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

        //显示所有的文本 
        //设置大小、填充颜色、名字、text()设置文本
        //attr("text-anchor", "middle")文本居中
        var text = svg.append("g").attr("class", "texts").selectAll("text").data(graph.nodes)
        .enter().append("text").attr("font-size", function(d) {
            return d.size;
        }).attr("fill", function(d) {
            return colors[d.group];
        }).attr('name', function(d) {
            return d.id;
        }).text(function(d) {
            return d.id;
        }).attr('text-anchor', 'middle').call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

        //圆增加title
        node.append("title").text(function(d) {
            return d.id;
        })

        //simulation中ticked数据初始化，并生成图形
        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        //ticked()函数确定link线的起始点x、y坐标 node确定中心点 文本通过translate平移变化
        function ticked() {
            link
                .attr("x1", function(d) {
                    return d.source.x;
                })
                .attr("y1", function(d) {
                    return d.source.y;
                })
                .attr("x2", function(d) {
                    return d.target.x;
                })
                .attr("y2", function(d) {
                    return d.target.y;
                });

            node
                .attr("cx", function(d) {
                    return d.x;
                })
                .attr("cy", function(d) {
                    return d.y;
                });

            text.
            attr('transform', function(d) {
                return 'translate(' + d.x + ',' + (d.y + d.size / 2) + ')';
            });
        }
    });
    //加载Python获取的Json信息：六类实体详细属性信息
    var info;

    //d3.json获取数据
    d3.json("allData.json", function(error, data) {
        if(error) throw error;
        info = data;
    });
    // Cross origin requests are only supported for protocol schemes: http, data, chrome, chrome-extension
    // 本地json数据需要放置服务器中请求 XAMPP

    //该变量保证拖动鼠标时，不会影响图形变换，默认为false未选中鼠标
    var dragging = false;

    //开始拖动并更新相应的点
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        dragging = true;
    }

    //拖动进行中
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    //拖动结束
    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        dragging = false;
    }

    //span点击事件
    $('#mode span').click(function(event) {
        //span都设置为不激活状态
        $('#mode span').removeClass('active');

        //点击的span被激活
        $(this).addClass('active');

        //text隐藏 nodes显示
        if ($(this).text() == 'Node') {
            $('.texts text').hide();
            $('.nodes circle').show();
        } else {
            $('.texts text').show();
            $('.nodes circle').hide();
        }
    });

    //为svg1父元素下的.nodes circle元素绑定鼠标进入事件
    $('#svg1').on('mouseenter', '.nodes circle', function(event) {
        //通过变量dragging保证拖动鼠标时，其状态不受影响，从而改变图形
        //鼠标没有拖动才能处理事件
        if(!dragging) {
            //获取被选中元素的名字
            var name = $(this).attr("name");

            //设置#info h4样式的颜色为该节点的颜色，文本为该节点name
            //$(this).attr('fill')表示当前悬浮圆的填充色
            $('#info h4').css('color', $(this).attr('fill')).text(name);

            //每次点击添加属性前把上次显示的信息去除，否则会不断叠加
            $('#info p').remove();

            //打印悬浮的节点信息
            //console.log(info[name]);

            //遍历所有的
            for (var key in info[name]) {
                //类型复杂的不进行显示
                if (typeof(info[name][key]) == 'object') {
                    continue;
                }
                //比较复杂的超链接字段不显示
                if (key == 'url' || key == 'title' || key == 'name' || 
                    key == 'edited' || key == 'created' || key == 'homeworld') {
                    continue;
                }
                //显示值及其字段名字
                $('#info').append('<p><span>' + key + '</span>' + info[name][key] + '</p>');
            }

            //选择#svg1 .nodes中所有的circle，再增加个class
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', function(d) {
                //数据的id是否等于name,返回空
                if(d.id==name) {
                    return '';
                } 
                //当前节点返回空，否则其他节点循环判断是否被隐藏起来(CSS设置隐藏)
                else {
                    //links链接的起始节点进行判断,如果其id等于name则显示这类节点
                    //注意: graph=data
                    for (var i = 0; i < graph.links.length; i++) {
                        //如果links的起点等于name，并且终点等于正在处理的则显示
                        if (graph.links[i]['source'].id == name && graph.links[i]['target'].id == d.id) {
                            return '';
                        }
                        if (graph.links[i]['target'].id == name && graph.links[i]['source'].id == d.id) {
                            return '';
                        }
                    }
                    return "inactive"; //前面CSS定义 .nodes circle.inactive
                }
            });

            //处理相邻的边line是否隐藏 注意 || 
            d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
                if (d.source.id == name || d.target.id == name) {
                    return '';
                } else {
                    return 'inactive';
                }
            });
        }
       });

    //鼠标移开还原原图，显示所有隐藏的点及边
    $('#svg1').on('mouseleave', '.nodes circle', function(event) {
        //如果dragging为false才处理事件
        if(!dragging) {
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', '');
               d3.select('#svg1 .links').selectAll('line').attr('class', '');
        } 
    });

    //鼠标进入文本显示相邻节点及边
    $('#svg1').on('mouseenter', '.texts text', function(event) {
        if (!dragging) {
            var name = $(this).attr('name');

            //同样的代码从选中圆中赋值过来
            $('#info h4').css('color', $(this).attr('fill')).text(name);
            $('#info p').remove();
            for (var key in info[name]) {
                if (typeof(info[name][key]) == 'object') {
                    continue;
                }
                if (key == 'url' || key == 'title' || key == 'name' || key == 'edited' || key == 'created' || key == 'homeworld') {
                    continue;
                }
                $('#info').append('<p><span>' + key + '</span>' + info[name][key] + '</p>');
            }

            d3.select('#svg1 .texts').selectAll('text').attr('class', function(d) {
                if (d.id == name) {
                    return '';
                }

                for (var i = 0; i < graph.links.length; i++) {
                    if (graph.links[i]['source'].id == name && graph.links[i]['target'].id == d.id) {
                        return '';
                    }
                    if (graph.links[i]['target'].id == name && graph.links[i]['source'].id == d.id) {
                        return '';
                    }
                }
                return 'inactive';
            });
            d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
                if (d.source.id == name || d.target.id == name) {
                    return '';
                } else {
                    return 'inactive';
                }
            });
        }
    });

    //鼠标移除文本还原相应节点及边
    $('#svg1').on('mouseleave', '.texts text', function(event) {
        if (!dragging) {
            d3.select('#svg1 .texts').selectAll('text').attr('class', '');
            d3.select('#svg1 .links').selectAll('line').attr('class', '');
        }
    });

    //搜索框中输入内容则响应该事件
    //keyup按键敲击响应event
    $('#search input').keyup(function(event) {
        //如果Input值是空的显示所有的圆和线(没有进行筛选)
        if ($(this).val() == '') {
            d3.select('#svg1 .texts').selectAll('text').attr('class', '');
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', '');
            d3.select('#svg1 .links').selectAll('line').attr('class', '');
        }
        //否则判断判断三个元素是否等于name值，等于则显示该值
        else {
            var name = $(this).val();
            //搜索所有的节点
            d3.select('#svg1 .nodes').selectAll('circle').attr('class', function(d) {
                //输入节点id的小写等于name则显示，否则隐藏
                if (d.id.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
                    return '';
                } else {
                    //优化：与该搜索节点相关联的节点均显示
                    //links链接的起始节点进行判断,如果其id等于name则显示这类节点
                    //注意: graph=data
                    for (var i = 0; i < graph.links.length; i++) {
                        //如果links的起点等于name，并且终点等于正在处理的则显示
                        if ((graph.links[i]['source'].id.toLowerCase().indexOf(name.toLowerCase()) >= 0) && 
                            (graph.links[i]['target'].id == d.id)) {
                            return '';
                        }
                        //如果links的终点等于name，并且起点等于正在处理的则显示
                        if ((graph.links[i]['target'].id.toLowerCase().indexOf(name.toLowerCase()) >= 0) && 
                            (graph.links[i]['source'].id == d.id)) {
                            return '';
                        }
                    }  
                    return 'inactive'; //隐藏其他节点  
                }

            });

            //搜索texts
            d3.select('#svg1 .texts').selectAll('text').attr('class', function(d) {
                if (d.id.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
                    return '';
                } else {
                    //优化：与该搜索节点相关联的节点均显示
                    //links链接的起始节点进行判断,如果其id等于name则显示这类节点
                    //注意: graph=data
                    for (var i = 0; i < graph.links.length; i++) {
                        //如果links的起点等于name，并且终点等于正在处理的则显示
                        if ((graph.links[i]['source'].id.toLowerCase().indexOf(name.toLowerCase()) >= 0) && 
                            (graph.links[i]['target'].id == d.id)) {
                            return '';
                        }
                        //如果links的终点等于name，并且起点等于正在处理的则显示
                        if ((graph.links[i]['target'].id.toLowerCase().indexOf(name.toLowerCase()) >= 0) && 
                            (graph.links[i]['source'].id == d.id)) {
                            return '';
                        }
                    }  
                    return 'inactive'; //隐藏其他节点
                }
            });

            //搜索links 所有与搜索name相关联的边均显示
            //显示相的邻边 注意 || 
            //name=$(this).val()：名字为键盘输入的内容
            d3.select("#svg1 .links").selectAll('line').attr('class', function(d) {
                if ((d.source.id.toLowerCase().indexOf(name.toLowerCase()) >= 0) || 
                    (d.target.id.toLowerCase().indexOf(name.toLowerCase()) >= 0) 
                    ) {
                    return '';
                } else {
                    return 'inactive'; //隐藏
                }
            });
        }
    }); //end input

    
});