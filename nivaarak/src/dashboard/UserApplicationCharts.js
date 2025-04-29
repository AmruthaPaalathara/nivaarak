import React, { useEffect, useRef, useState } from 'react';

const UserApplicationsChart = () => {
    const chartContainer = useRef(null);
    const [totalData, setTotalData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const response = await API.get('/charts/user-applications');
                const result = response.data;

                if (result.success) {
                    setTotalData(result.totalApplications);
                    setStatusData(result.statusBreakdown);
                } else {
                    console.error(result.message);
                }
            } catch (error) {
                console.error("Chart fetch error:", error);
            }
        };

        fetchChartData();
    }, []);

    useEffect(() => {
        if (window.Highcharts && chartContainer.current && totalData.length > 0) {
            // Prepare categories and series
            const categories = totalData.map(item => item._id);

            // Group status breakdown
            const statuses = ["Approved", "Pending", "Rejected"];
            const series = statuses.map(status => ({
                name: status,
                data: categories.map(docType => {
                    const entry = statusData.find(item => item._id.documentType === docType && item._id.status === status);
                    return entry ? entry.count : 0;
                })
            }));

            window.Highcharts.chart(chartContainer.current, {
                chart: {
                    type: 'column'
                },
                title: {
                    text: 'User Applications by Certificate Type'
                },
                xAxis: {
                    categories: categories,
                    title: { text: 'Certificate Type' }
                },
                yAxis: {
                    min: 0,
                    title: { text: 'Number of Applications' },
                    stackLabels: {
                        enabled: true
                    }
                },
                tooltip: {
                    shared: true
                },
                plotOptions: {
                    column: {
                        stacking: 'normal'
                    }
                },
                series: series
            });
        }
    }, [totalData, statusData]);

    return <div ref={chartContainer} style={{ width: '100%', height: '500px' }}></div>;
};

export default UserApplicationsChart;
