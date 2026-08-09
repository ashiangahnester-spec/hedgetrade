import React, { useEffect, useMemo, useState } from 'react';
import './market-analysis.scss';

type Tick = {
    epoch: number;
    quote: number;
};

type Market = {
    name: string;
    symbol: string;
};

const MARKETS: Market[] = [
    { name: 'Volatility 100 (1s)', symbol: '1HZ100V' },
    { name: 'Volatility 75 (1s)', symbol: '1HZ75V' },
    { name: 'Volatility 50 (1s)', symbol: '1HZ50V' },
    { name: 'Volatility 25 (1s)', symbol: '1HZ25V' },
    { name: 'Volatility 10 (1s)', symbol: '1HZ10V' },
    { name: 'Volatility 100', symbol: 'R_100' },
    { name: 'Volatility 75', symbol: 'R_75' },
    { name: 'Volatility 50', symbol: 'R_50' },
    { name: 'Volatility 25', symbol: 'R_25' },
    { name: 'Volatility 10', symbol: 'R_10' },
];

const getLastDigit = (quote: number) => {
    const text = quote.toFixed(2);
    return Number(text[text.length - 1]);
};

const MarketAnalysis = () => {
    const [selectedMarket, setSelectedMarket] = useState(MARKETS[0]);
    const [ticks, setTicks] = useState<Tick[]>([]);
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [connected, setConnected] = useState(false);
    const [secondsToEntry, setSecondsToEntry] = useState(5);

    /*
     * Temporary local tick listener.
     *
     * The existing Deriv connection remains untouched.
     * The connection can be wired to the existing api_base in the next step.
     */
    useEffect(() => {
        setTicks([]);
        setLivePrice(null);
        setSecondsToEntry(5);
    }, [selectedMarket]);

    /*
     * Entry countdown.
     */
    useEffect(() => {
        const timer = window.setInterval(() => {
            setSecondsToEntry(current => {
                if (current <= 1) return 5;
                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    const digitStats = useMemo(() => {
        const counts = Array(10).fill(0);

        ticks.forEach(tick => {
            counts[getLastDigit(tick.quote)] += 1;
        });

        const total = ticks.length;

        return counts.map((count, digit) => ({
            digit,
            count,
            percentage: total ? (count / total) * 100 : 0,
        }));
    }, [ticks]);

    const strongestDigit = useMemo(() => {
        if (!ticks.length) return null;

        return [...digitStats].sort((a, b) => b.count - a.count)[0];
    }, [digitStats, ticks.length]);

    const evenPercentage = useMemo(() => {
        if (!ticks.length) return 0;

        const even = ticks.filter(tick => getLastDigit(tick.quote) % 2 === 0).length;

        return (even / ticks.length) * 100;
    }, [ticks]);

    const oddPercentage = ticks.length ? 100 - evenPercentage : 0;

    const over2Percentage = useMemo(() => {
        if (!ticks.length) return 0;

        return (
            (ticks.filter(tick => getLastDigit(tick.quote) > 2).length / ticks.length) *
            100
        );
    }, [ticks]);

    const under7Percentage = useMemo(() => {
        if (!ticks.length) return 0;

        return (
            (ticks.filter(tick => getLastDigit(tick.quote) < 7).length / ticks.length) *
            100
        );
    }, [ticks]);

    const marketState = useMemo(() => {
        if (!ticks.length) return 'WAITING FOR MARKET DATA';

        if (strongestDigit && strongestDigit.percentage >= 20) {
            return 'STRONG DIGIT DOMINATION';
        }

        if (evenPercentage >= 55 || oddPercentage >= 55) {
            return 'EVEN / ODD BIAS';
        }

        if (over2Percentage >= 60 || under7Percentage >= 60) {
            return 'OVER / UNDER BIAS';
        }

        return 'BALANCED MARKET';
    }, [
        ticks.length,
        strongestDigit,
        evenPercentage,
        oddPercentage,
        over2Percentage,
        under7Percentage,
    ]);

    return (
        <div className="market-analysis">
            <div className="market-analysis__header">
                <div>
                    <div className="market-analysis__eyebrow">
                        HEDGETRADE • LIVE ANALYSIS
                    </div>

                    <h1>Market Analysis</h1>

                    <p>
                        Live digit behaviour, market type and current entry state.
                    </p>
                </div>

                <div className={`connection ${connected ? 'connection--live' : ''}`}>
                    <span />
                    {connected ? 'LIVE' : 'CONNECTING'}
                </div>
            </div>

            <div className="market-analysis__layout">
                <aside className="market-list">
                    <div className="market-list__title">
                        VOLATILITY MARKETS
                    </div>

                    {MARKETS.map(market => (
                        <button
                            key={market.symbol}
                            className={
                                selectedMarket.symbol === market.symbol
                                    ? 'market-item market-item--active'
                                    : 'market-item'
                            }
                            onClick={() => setSelectedMarket(market)}
                        >
                            <span>{market.name}</span>
                            <small>{market.symbol}</small>
                        </button>
                    ))}
                </aside>

                <main className="analysis-panel">
                    <div className="market-title">
                        <div>
                            <span className="live-label">LIVE</span>
                            <h2>{selectedMarket.name}</h2>
                            <small>{selectedMarket.symbol}</small>
                        </div>

                        <div className="price-box">
                            <span>LIVE PRICE</span>
                            <strong>
                                {livePrice !== null
                                    ? livePrice.toFixed(2)
                                    : '--.--'}
                            </strong>
                        </div>
                    </div>

                    <div className="state-card">
                        <span>CURRENT MARKET STATE</span>
                        <strong>{marketState}</strong>
                    </div>

                    <div className="analysis-grid">
                        <div className="analysis-card">
                            <span>DOMINATING DIGIT</span>

                            <strong>
                                {strongestDigit ? strongestDigit.digit : '--'}
                            </strong>

                            <small>
                                {strongestDigit
                                    ? `${strongestDigit.percentage.toFixed(1)}%`
                                    : 'Waiting for ticks'}
                            </small>
                        </div>

                        <div className="analysis-card">
                            <span>EVEN</span>

                            <strong>{evenPercentage.toFixed(1)}%</strong>

                            <small>Current distribution</small>
                        </div>

                        <div className="analysis-card">
                            <span>ODD</span>

                            <strong>{oddPercentage.toFixed(1)}%</strong>

                            <small>Current distribution</small>
                        </div>

                        <div className="analysis-card">
                            <span>OVER 2</span>

                            <strong>{over2Percentage.toFixed(1)}%</strong>

                            <small>Digits 3–9</small>
                        </div>

                        <div className="analysis-card">
                            <span>UNDER 7</span>

                            <strong>{under7Percentage.toFixed(1)}%</strong>

                            <small>Digits 0–6</small>
                        </div>

                        <div className="analysis-card entry-card">
                            <span>ENTRY</span>

                            <strong>IN {secondsToEntry}s</strong>

                            <small>Next analysis window</small>
                        </div>
                    </div>

                    <div className="digit-panel">
                        <div className="digit-panel__header">
                            <div>
                                <span>DIGIT DISTRIBUTION</span>
                                <small>
                                    {ticks.length} ticks analysed
                                </small>
                            </div>
                        </div>

                        <div className="digit-bars">
                            {digitStats.map(stat => (
                                <div className="digit-row" key={stat.digit}>
                                    <span>{stat.digit}</span>

                                    <div className="digit-bar">
                                        <div
                                            style={{
                                                width: `${Math.min(
                                                    stat.percentage,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <strong>
                                        {stat.percentage.toFixed(1)}%
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="tick-panel">
                        <div className="tick-panel__header">
                            <span>RECENT TICKS</span>
                            <span>{ticks.length}</span>
                        </div>

                        <div className="tick-list">
                            {ticks
                                .slice(-20)
                                .reverse()
                                .map((tick, index) => (
                                    <div
                                        className="tick"
                                        key={`${tick.epoch}-${index}`}
                                    >
                                        <span>
                                            {new Date(
                                                tick.epoch * 1000
                                            ).toLocaleTimeString()}
                                        </span>

                                        <strong>
                                            {tick.quote.toFixed(2)}
                                        </strong>

                                        <b>
                                            {getLastDigit(tick.quote)}
                                        </b>
                                    </div>
                                ))}

                            {!ticks.length && (
                                <div className="empty-state">
                                    Waiting for live Deriv ticks...
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MarketAnalysis;
