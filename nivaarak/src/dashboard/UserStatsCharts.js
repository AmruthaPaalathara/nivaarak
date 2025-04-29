import React, { useEffect, useRef } from 'react';

const UserStatsChart = ({ total, emergency, documentStats = [] }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (window.Highcharts && chartRef.current) {
            const Highcharts = window.Highcharts; // 👈 use window.Highcharts
            if (typeof Highcharts === 'object' && Highcharts.drilldown) {
                console.log('Highcharts and Drilldown modules ready.');
            }

            Highcharts.chart(chartRef.current, {
                chart: {
                    type: 'column',
                    events: {
                        drilldown: function (e) {
                            console.log('Drilldown event triggered', e);
                        },
                        drillup: function () {
                            console.log('Drillup event triggered');
                        }
                    }
                },
                title: {
                    text: 'User Application Stats'
                },
                xAxis: {
                    type: 'category',
                    scrollbar: { enabled: true }
                },
                yAxis: {
                    title: { text: 'Count' }
                },
                legend: { enabled: false },
                plotOptions: {
                    series: {
                        borderWidth: 0,
                        dataLabels: { enabled: true }
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:14px">{series.name}</span><br>',
                    pointFormat: '<span>{point.name}</span>: <b>{point.y}</b>'
                },
                exporting: { enabled: true },
                series: [
                    {
                        name: 'Applications',
                        colorByPoint: true,
                        colors: ['#390536', '#94099c'],
                        data: [
                            {
                                name: 'Total Applications',
                                y: total,
                                drilldown: 'documentTypes',
                                color: '#390536'
                            },
                            {
                                name: 'Emergency Applications',
                                y: emergency,
                                drilldown: null,
                                color: '#94099c'
                            }
                        ]
                    }
                ],
                drilldown: {
                    series: [
                        {
                            id: 'documentTypes',
                            name: 'Document Types',
                            data: documentStats.map(item => [item._id, item.count])

                        }
                    ]
                }
            });
        }
    }, [total, emergency, documentStats]);

    return <div ref={chartRef} style={{ width: '100%', height: '500px' }} />;
};

export default UserStatsChart;
