import React, { useEffect, useRef, useState, useMemo } from 'react';
import API from '../utils/api';

const ApplicationByTypeChart = ({
                                    title = "Applications by Certificate Type",
                                    apiEndpoint = "/userCharts/user-applications",
                                    externalData = null
                                }) => {
    const chartContainer = useRef(null);
    const [totalData, setTotalData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                console.log("API Endpoint being called:", apiEndpoint);
                const response = await API.get(apiEndpoint);
                console.log("Chart API Response:", response.data);
                const result = response.data;

                if (result.success) {
                    setTotalData(result.totalApplications || []);
                    setStatusData(result.statusBreakdown || []);
                } else {
                    setError(result.message || "Failed to fetch data.");
                }
            } catch (error) {
                console.error("Chart fetch error:", error);
                setError("Failed to fetch chart data. Please try again.");
            }
        };

        console.log("Chart Data Response:", totalData);

        if (!externalData) {
            fetchChartData();
        } else {
            setTotalData(externalData.totalApplications || []);
            setStatusData(externalData.statusBreakdown || []);
        }
    }, [apiEndpoint, externalData]);

    // Memoized Highcharts Configuration
    const chartOptions = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: title },
        xAxis: { categories: totalData.map(item => item.documentType), title: { text: 'Document Type' } },
        yAxis: { min: 0, title: { text: 'Number of Applications' }, stackLabels: { enabled: true } },
        tooltip: { shared: true },
        plotOptions: { column: { stacking: 'normal' } },
        series: ["Approved", "Pending", "Rejected"].map(status => ({
            name: status,
            data: totalData.map(doc => {
                const entry = statusData.find(item => item.documentType === doc.documentType && item.status === status);
                return entry ? entry.count : 0;
            })
        }))
    }), [totalData, statusData, title]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts not loaded.");
            return;
        }

        if (window.Highcharts && chartContainer.current && totalData.length > 0) {
            window.Highcharts.chart(chartContainer.current, chartOptions);
        }
    }, [chartOptions]);

    // Handle error or empty data
    if (error) {
        return <p style={{ color: "red" }}>{error}</p>;
    }

    console.log("Chart API Data:", totalData);
    console.log("Status Breakdown Data:", statusData);

    if (!totalData.length) {
        return <p>No application data available.</p>;
    }

    return <div ref={chartContainer} style={{ width: '100%', height: '500px' }} />;
};

export default ApplicationByTypeChart;