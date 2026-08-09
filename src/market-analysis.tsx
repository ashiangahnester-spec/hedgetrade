import React, { useEffect, useMemo, useState } from 'react';
import './market-analysis.scss';

type Tick = {
    epoch: number;
    quote: number;
};

const MARKETS = [
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
    { symbol: 'R_100', name: 'Volatility 100' },
    { symbol: 'R_75', name: 'Volatility 75' },
    { symbol: 'R_50', name: 'Volatility 50' },
    { symbol: 'R_25', name: 'Volatility 25' },
    { symbol: 'R_10', name: 'Volatility 10' },
];

const getLastDigit = (quote: number) => {
    const text = String(quote);
    const digits = text.replace(/\D/g, '');
    return Number(digits.charAt(digits.length - 1));
};

const calculateStats = (ticks: Tick[]) => {
    const digitCounts = Array(10).fill(0);

    ticks.forEach(tick => {
        const digit = getLastDigit(tick.quote);
        if (!Number.isNaN(digit)) digitCounts[digit]++;
    });

    const total = ticks.length || 1;

    const digits = digitCounts.map((count, digit) => ({
        digit,
        count,
        percentage: (count / total) * 100,
    }));

    const strongestDigit = [...digits].sort((a, b) => b.count - a.count)[0];

    const evenCount = digits
        .filter(item => item.digit % 2 === 0)
        .reduce((sum, item) => sum + item.count, 0);

    const oddCount = ticks.length - evenCount;

    const overCount = digits
        .filter(item => item.digit > 2)
        .reduce((sum, item) => sum + item.count, 0);

    const underCount = ticks.length - overCount;

    const evenPercentage = (evenCount / total) * 100;
    const oddPercentage = (oddCount / total) * 100;
    const overPercentage = (overCount / total) * 100;
    const underPercentage = (underCount / total) * 100;

    const markets = [
        { name: 'OVER', percentage: overPercentage },
        { name: 'UNDER', percentage: underPercentage },
        { name: 'EVEN', percentage: evenPercentage },
        { name: 'ODD', percentage: oddPercentage },
    ];

    const strongestMarket = [...markets].sort((a, b) => b.percentage - a.percentage)[0];

    return {
        digits,
        strongestDigit,
        markets,
        strongestMarket,
    };
};

const MarketAnalysis = () => {
    const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
    const [ticks, setTicks] = useState<Tick[]>([]);
    const [connected, setConnected] = useState(false);
    const [entrySeconds, setEntrySeconds] = useState(5);

    /*
     * Temporary live-stream connection.
     *
     * This will be replaced with the existing Hedgetrade
     * TicksService connection in the next step.
     */
    useEffect(() => {
        let socket: WebSocket | null = null;
        let cancelled = false;

        const connect = () => {
            socket = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

            socket.onopen = () => {
                if (cancelled) return;

                setConnected(true);

                socket?.send(
                    JSON.stringify({
                        ticks_history: selectedMarket.symbol,
                        subscribe: 1,
                        end: 'latest',
                        count: 100,
                        style: 'ticks',
                    })
                );
            };

            socket.onmessage = event => {
                if (cancelled) return;

                try {
                    const data = JSON.parse(event.data);

                    if (data.history?.prices) {
                        const historyTicks: Tick[] = data.history.prices.map((price: number, index: number) => ({
                            quote: Number(price),
                            epoch: Number(data.history.times?.[index] || Date.now() / 1000),
                        }));

                        setTicks(historyTicks.slice(-100));
                    }

                    if (data.tick) {
                        const tick: Tick = {
                            quote: Number(data.tick.quote),
                            epoch: Number(data.tick.epoch),
                        };

                        setTicks(previous => [...previous, tick].slice(-100));
                    }
                } catch (error) {
                    console.error('Market analysis tick error:', error);
                }
            };

            socket.onclose = () => {
                if (!cancelled) setConnected(false);
            };

            socket.onerror = () => {
                if (!cancelled) setConnected(false);
            };
        };

        setTicks([]);
        connect();

        return () => {
            cancelled = true;
            socket?.close();
        };
    }, [selectedMarket.symbol]);

    const stats = useMemo(() => calculateStats(ticks), [ticks]);

    useEffect(() => {
        setEntrySeconds(5);

        const timer = window.setInterval(() => {
            setEntrySeconds(previous => {
                if (previous <= 1) return 5;
                return previous - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [stats.strongestMarket.name]);

    const lastTick = ticks[ticks.length - 1];

    return (
        <div className='market-analysis'>
            <div className='market-analysis__header'>
                <div>
                    <span className='market-analysis__eyebrow'>HEDGETRADE</span>
                    <h1>Market Analysis</h1>
                </div>

                <div className={connected ? 'connection live' : 'connection'}>
                    <span />
                    {connected ? 'LIVE' : 'CONNECTING'}
                </div>
            </div>

            <div className='market-analysis__controls'>
                <select
                    value={selectedMarket.symbol}
                    onChange={event => {
                        const market = MARKETS.find(item => item.symbol === event.target.value);
                        if (market) setSelectedMarket(market);
                    }}
                >
                    {MARKETS.map(market => (
                        <option key={market.symbol} value={market.symbol}>
                            {market.name}
                        </option>
                    ))}
                </select>

                <div className='price-card'>
                    <span>LIVE PRICE</span>
                    <strong>{lastTick ? lastTick.quote.toFixed(2) : '---'}</strong>
                </div>
            </div>

            <div className='analysis-grid'>
                <section className='panel'>
                    <div className='panel-title'>
                        <span>Digit Analysis</span>
                        <small>{ticks.length} ticks</small>
                    </div>

                    <div className='digit-list'>
                        {stats.digits.map(item => (
                            <div className='digit-row' key={item.digit}>
                                <strong>{item.digit}</strong>

                                <div className='digit-bar'>
                                    <div style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                                </div>

                                <span>{item.percentage.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>

                    <div className='strongest-digit'>
                        <span>STRONGEST DIGIT</span>
                        <strong>{stats.strongestDigit?.digit ?? '-'}</strong>
                        <b>{stats.strongestDigit?.percentage.toFixed(1) ?? '0.0'}%</b>
                    </div>
                </section>

                <section className='panel'>
                    <div className='panel-title'>
                        <span>Market Type</span>
                        <small>Current state</small>
                    </div>

                    <div className='market-types'>
                        {stats.markets.map(market => (
                            <div
                                className={`market-type ${
                                    stats.strongestMarket.name === market.name ? 'market-type--strongest' : ''
                                }`}
                                key={market.name}
                            >
                                <span>{market.name}</span>
                                <strong>{market.percentage.toFixed(1)}%</strong>
                            </div>
                        ))}
                    </div>

                    <div className='current-state'>
                        <span>STRONGEST MARKET</span>
                        <strong>{stats.strongestMarket.name}</strong>
                        <b>{stats.strongestMarket.percentage.toFixed(1)}%</b>
                    </div>
                </section>
            </div>

            <section className='entry-card'>
                <span>ANALYSIS ENTRY TIMER</span>

                <strong>ENTRY IN {entrySeconds} SECS</strong>

                <small>
                    {ticks.length
                        ? `Current state: ${stats.strongestMarket.name}`
                        : 'Waiting for live tick data...'}
                </small>
            </section>

            <div className='market-analysis__footer'>
                <span>MARKET: {selectedMarket.name}</span>
                <span>TICKS: {ticks.length}</span>
                <span>STREAM: {connected ? 'CONNECTED' : 'OFFLINE'}</span>
            </div>
        </div>
    );
};

export default MarketAnalysis;
