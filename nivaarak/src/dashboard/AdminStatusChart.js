import React, { useEffect, useRef, useState, useMemo } from 'react';
import API from "../utils/api";

const AdminStatusChart = () => {
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const userRole = localStorage.getItem("userRole") || "user"; // Could be improved via useAuth()
    const endpoint = userRole === "admin"
        ? "/admin-dashboard/status-stats"
        : "/userCharts/user-applications";

    useEffect(() => {
        const fetchStatusData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    setError("Authentication token missing.");
                    setLoading(false);
                    return;
                }

                const res = await API.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const { Pending = 0, Approved = 0, Rejected = 0 } = res.data || {};
                setChartData([
                    { name: 'Pending', y: Pending, color: '#f0ad4e' },
                    { name: 'Approved', y: Approved, color: '#5cb85c' },
                    { name: 'Rejected', y: Rejected, color: '#d9534f' }
                ]);
            } catch (err) {
                console.error("Chart fetch error:", err);
                setError("Failed to fetch chart data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchStatusData();
    }, [endpoint]);

    const chartTitle = userRole === "admin"
        ? "Admin Application Status Distribution"
        : "Your Application Status Overview";

    const chartConfig = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: chartTitle },
        xAxis: {
            categories: chartData?.map(d => d.name),
            title: { text: 'Status' }
        },
        yAxis: {
            min: 0,
            title: { text: 'Number of Applications' }
        },
        series: [{
            name: 'Applications',
            data: chartData
        }],
        plotOptions: {
            column: {
                dataLabels: { enabled: true }
            }
        },
        credits: { enabled: false }
    }), [chartData, chartTitle]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts not loaded.");
            return;
        }

        if (chartRef.current && chartData) {
            window.Highcharts.chart(chartRef.current, chartConfig);
        }
    }, [chartData, chartConfig]);

    if (loading) return <p>Loading chart data...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default AdminStatusChart;
