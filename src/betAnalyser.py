"""
SportyBet Bet Analysis Script
Generates comprehensive betting metrics from scraped JSON data
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import statistics


class BetAnalyzer:
    """Analyzes betting data and generates comprehensive metrics"""

    def __init__(self, json_file_path: str):
        self.json_file_path = json_file_path
        self.bets = []
        self.load_data()

    def load_data(self):
        """Load bet data from JSON file"""
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Handle both formats: direct bets array or bets within summary
            if isinstance(data, list):
                self.bets = data
            elif isinstance(data, dict) and 'bets' in data:
                self.bets = data['bets']
            else:
                raise ValueError("Invalid JSON format. Expected list of bets or dict with 'bets' key")
            
            print(f"✅ Loaded {len(self.bets)} bets from {self.json_file_path}\n")
        except FileNotFoundError:
            print(f"❌ File not found: {self.json_file_path}")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON file: {self.json_file_path}")
            sys.exit(1)

    def parse_stake_return(self, value) -> float:
        """Parse stake/return value handling various formats"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove commas and convert to float
            return float(value.replace(',', '').strip())
        return 0.0

    def get_total_stakes(self) -> float:
        """Calculate total stakes"""
        total = 0.0
        for bet in self.bets:
            stake = bet.get('total_stake', 0)
            total += self.parse_stake_return(stake)
        return total

    def get_total_returns(self) -> float:
        """Calculate total returns"""
        total = 0.0
        for bet in self.bets:
            ret = bet.get('total_return', 0)
            total += self.parse_stake_return(ret)
        return total

    def get_won_bets(self) -> List[Dict]:
        """Get all won bets"""
        return [bet for bet in self.bets if bet.get('status', '').lower() == 'won']

    def get_lost_bets(self) -> List[Dict]:
        """Get all lost bets"""
        return [bet for bet in self.bets if bet.get('status', '').lower() == 'lost']

    def get_pending_bets(self) -> List[Dict]:
        """Get all pending bets"""
        return [bet for bet in self.bets if bet.get('status', '').lower() == 'pending']

    def get_cancelled_bets(self) -> List[Dict]:
        """Get all cancelled bets"""
        return [bet for bet in self.bets if bet.get('status', '').lower() == 'cancelled']

    def calculate_roi(self) -> float:
        """Calculate Return on Investment percentage"""
        total_stake = self.get_total_stakes()
        if total_stake == 0:
            return 0.0
        total_return = self.get_total_returns()
        roi = ((total_return - total_stake) / total_stake) * 100
        return roi

    def calculate_win_rate(self) -> float:
        """Calculate win rate percentage"""
        if len(self.bets) == 0:
            return 0.0
        won = len(self.get_won_bets())
        return (won / len(self.bets)) * 100

    def calculate_loss_rate(self) -> float:
        """Calculate loss rate percentage"""
        if len(self.bets) == 0:
            return 0.0
        lost = len(self.get_lost_bets())
        return (lost / len(self.bets)) * 100

    def get_date_range(self) -> Tuple[str, str, int]:
        """Get earliest and latest bet dates and day span"""
        if not self.bets:
            return None, None, 0
        
        dates = []
        for bet in self.bets:
            date_str = bet.get('date_time', '')
            if date_str:
                try:
                    # Parse DD/MM/YYYY HH:MM format
                    date_obj = datetime.strptime(date_str.split()[0], '%d/%m/%Y')
                    dates.append(date_obj)
                except:
                    pass
        
        if not dates:
            return None, None, 0
        
        earliest = min(dates)
        latest = max(dates)
        day_span = (latest - earliest).days
        
        return earliest.strftime('%d/%m/%Y'), latest.strftime('%d/%m/%Y'), day_span

    def calculate_average_stake(self) -> float:
        """Calculate average stake per bet"""
        if len(self.bets) == 0:
            return 0.0
        total_stake = self.get_total_stakes()
        return total_stake / len(self.bets)

    def calculate_average_return(self) -> float:
        """Calculate average return per bet"""
        if len(self.bets) == 0:
            return 0.0
        total_return = self.get_total_returns()
        return total_return / len(self.bets)

    def calculate_average_win(self) -> float:
        """Calculate average win amount (won bets only)"""
        won_bets = self.get_won_bets()
        if len(won_bets) == 0:
            return 0.0
        total_win = sum(self.parse_stake_return(bet.get('total_return', 0)) for bet in won_bets)
        return total_win / len(won_bets)

    def calculate_average_loss(self) -> float:
        """Calculate average loss amount (lost bets only)"""
        lost_bets = self.get_lost_bets()
        if len(lost_bets) == 0:
            return 0.0
        total_loss = sum(self.parse_stake_return(bet.get('total_stake', 0)) for bet in lost_bets)
        return total_loss / len(lost_bets)

    def calculate_greed_index(self) -> Tuple[float, str]:
        """
        Calculate greed index (0-10 scale)
        Based on: bet size variance, max bet ratio, and bet escalation
        """
        stakes = [self.parse_stake_return(bet.get('total_stake', 0)) for bet in self.bets]
        
        if not stakes or len(stakes) < 2:
            return 0.0, "N/A"
        
        min_stake = min(stakes)
        max_stake = max(stakes)
        avg_stake = statistics.mean(stakes)
        
        if min_stake == 0:
            min_stake = 0.01
        
        # Calculate metrics
        bet_ratio = max_stake / min_stake  # How much bigger is max vs min
        variance = statistics.variance(stakes) if len(stakes) > 1 else 0
        std_dev = statistics.stdev(stakes) if len(stakes) > 1 else 0
        
        # Normalize to 0-10 scale
        # Ratio component (0-5 points)
        ratio_score = min(5, (bet_ratio / 100))  # 500x ratio = 5 points
        
        # Variance component (0-5 points)
        variance_score = min(5, (std_dev / avg_stake) if avg_stake > 0 else 0)
        
        greed_index = ratio_score + variance_score
        greed_index = min(10, greed_index)  # Cap at 10
        
        if greed_index < 2:
            level = "🟢 LOW - Disciplined betting"
        elif greed_index < 4:
            level = "🟡 MODERATE - Some variance"
        elif greed_index < 6:
            level = "🟠 HIGH - Risky betting"
        else:
            level = "🔴 VERY HIGH - Reckless betting"
        
        return greed_index, level

    def detect_chasing_losses(self) -> Dict:
        """Detect loss chasing behavior"""
        chasing_events = []
        consecutive_losses = 0
        loss_streak_stake = 0
        
        for i, bet in enumerate(self.bets):
            status = bet.get('status', '').lower()
            stake = self.parse_stake_return(bet.get('total_stake', 0))
            
            if status == 'lost':
                consecutive_losses += 1
                loss_streak_stake += stake
                
                # Check if next bet is larger after losses
                if i + 1 < len(self.bets):
                    next_bet = self.bets[i + 1]
                    next_status = next_bet.get('status', '').lower()
                    next_stake = self.parse_stake_return(next_bet.get('total_stake', 0))
                    
                    if next_status == 'lost' and next_stake > stake * 1.5:
                        chasing_events.append({
                            'after_losses': consecutive_losses,
                            'previous_stake': stake,
                            'next_stake': next_stake,
                            'increase_percent': ((next_stake - stake) / stake) * 100,
                            'bet_index': i
                        })
            else:
                consecutive_losses = 0
                loss_streak_stake = 0
        
        return {
            'chasing_detected': len(chasing_events) > 0,
            'chasing_events': chasing_events,
            'total_chasing_events': len(chasing_events),
            'severity': 'SEVERE' if len(chasing_events) > 5 else 'MODERATE' if len(chasing_events) > 2 else 'MILD'
        }

    def calculate_kelly_criterion(self) -> Dict:
        """
        Calculate Kelly Criterion
        f* = (bp - q) / b
        where:
        - b = odds (average odds)
        - p = win probability
        - q = loss probability (1 - p)
        """
        win_rate = self.calculate_win_rate() / 100
        loss_rate = self.calculate_loss_rate() / 100
        
        # Calculate average odds from won bets
        won_bets = self.get_won_bets()
        if len(won_bets) == 0:
            return {
                'kelly_fraction': 0.0,
                'recommendation': '❌ STOP BETTING - No winning bets to calculate odds',
                'expected_value': 'Negative'
            }
        
        # Calculate average odds (return / stake)
        odds_list = []
        for bet in won_bets:
            stake = self.parse_stake_return(bet.get('total_stake', 0))
            ret = self.parse_stake_return(bet.get('total_return', 0))
            if stake > 0:
                odds = ret / stake
                odds_list.append(odds)
        
        avg_odds = statistics.mean(odds_list) if odds_list else 1.0
        b = avg_odds - 1  # Convert to decimal odds format
        
        if b <= 0:
            b = 0.1
        
        # Kelly formula
        kelly_fraction = (b * win_rate - loss_rate) / b
        
        # Recommendation
        if kelly_fraction < 0:
            recommendation = "❌ STOP BETTING - Negative expected value"
        elif kelly_fraction < 0.01:
            recommendation = "⚠️ AVOID - Minimal edge"
        elif kelly_fraction < 0.05:
            recommendation = "⚠️ CAUTION - Small edge, high risk"
        elif kelly_fraction < 0.1:
            recommendation = "✓ ACCEPTABLE - Moderate edge"
        else:
            recommendation = "✓ GOOD - Strong edge"
        
        return {
            'kelly_fraction': kelly_fraction,
            'kelly_percentage': kelly_fraction * 100,
            'average_odds': avg_odds,
            'win_probability': win_rate * 100,
            'loss_probability': loss_rate * 100,
            'recommendation': recommendation,
            'expected_value': 'Positive' if kelly_fraction > 0 else 'Negative'
        }

    def calculate_bankroll_status(self) -> Dict:
        """Calculate bankroll status and sustainability"""
        total_stake = self.get_total_stakes()
        total_return = self.get_total_returns()
        net_profit = total_return - total_stake
        
        # Estimate initial bankroll (assuming first bet was ~10% of bankroll)
        first_bet_stake = self.parse_stake_return(self.bets[0].get('total_stake', 0)) if self.bets else 0
        estimated_initial_bankroll = first_bet_stake * 10 if first_bet_stake > 0 else total_stake
        
        # Calculate burn rate
        earliest, latest, day_span = self.get_date_range()
        daily_burn_rate = total_stake / (day_span + 1) if day_span > 0 else 0
        
        # Sustainability
        if net_profit > 0:
            sustainability_days = "Profitable ✓"
        else:
            sustainability_days = "Unsustainable ✗"
        
        return {
            'total_staked': total_stake,
            'total_returned': total_return,
            'net_profit_loss': net_profit,
            'estimated_initial_bankroll': estimated_initial_bankroll,
            'bankroll_remaining_percent': (total_return / total_stake * 100) if total_stake > 0 else 0,
            'daily_burn_rate': daily_burn_rate,
            'sustainability': sustainability_days
        }

    def generate_report(self) -> str:
        """Generate comprehensive betting analysis report"""
        report = []
        report.append("\n" + "=" * 80)
        report.append("🎲 SPORTYBET BET ANALYSIS REPORT")
        report.append("=" * 80 + "\n")

        # Basic Stats
        report.append("📊 BASIC STATISTICS")
        report.append("-" * 80)
        report.append(f"Total Bets: {len(self.bets)}")
        report.append(f"Won Bets: {len(self.get_won_bets())} ✅")
        report.append(f"Lost Bets: {len(self.get_lost_bets())} ❌")
        report.append(f"Pending Bets: {len(self.get_pending_bets())} ⏳")
        report.append(f"Cancelled Bets: {len(self.get_cancelled_bets())} 🚫")
        report.append("")

        # Stakes and Returns
        report.append("💰 STAKES & RETURNS")
        report.append("-" * 80)
        total_stake = self.get_total_stakes()
        total_return = self.get_total_returns()
        net_profit = total_return - total_stake
        
        report.append(f"Total Stake: ₦{total_stake:,.2f}")
        report.append(f"Total Return: ₦{total_return:,.2f}")
        report.append(f"Net Profit/Loss: ₦{net_profit:,.2f} {'✅' if net_profit > 0 else '❌'}")
        report.append("")

        # Win/Loss Rates
        report.append("📈 WIN/LOSS RATES")
        report.append("-" * 80)
        win_rate = self.calculate_win_rate()
        loss_rate = self.calculate_loss_rate()
        
        report.append(f"Win Rate: {win_rate:.2f}%")
        report.append(f"Loss Rate: {loss_rate:.2f}%")
        report.append("")

        # ROI
        report.append("📊 RETURN ON INVESTMENT (ROI)")
        report.append("-" * 80)
        roi = self.calculate_roi()
        report.append(f"ROI: {roi:.2f}%")
        if roi < 0:
            report.append(f"⚠️ For every ₦100 staked, you lost ₦{abs(roi):.2f}")
        else:
            report.append(f"✅ For every ₦100 staked, you gained ₦{roi:.2f}")
        report.append("")

        # Average Metrics
        report.append("📉 AVERAGE METRICS")
        report.append("-" * 80)
        avg_stake = self.calculate_average_stake()
        avg_return = self.calculate_average_return()
        avg_win = self.calculate_average_win()
        avg_loss = self.calculate_average_loss()
        
        report.append(f"Average Stake per Bet: ₦{avg_stake:,.2f}")
        report.append(f"Average Return per Bet: ₦{avg_return:,.2f}")
        report.append(f"Average Win (Won bets only): ₦{avg_win:,.2f}")
        report.append(f"Average Loss (Lost bets only): ₦{avg_loss:,.2f}")
        report.append("")

        # Date Range
        report.append("📅 DATE RANGE")
        report.append("-" * 80)
        earliest, latest, day_span = self.get_date_range()
        report.append(f"Earliest Bet: {earliest}")
        report.append(f"Latest Bet: {latest}")
        report.append(f"Time Span: {day_span} days")
        if day_span > 0:
            betting_frequency = len(self.bets) / (day_span + 1)
            report.append(f"Betting Frequency: {betting_frequency:.2f} bets per day")
        report.append("")

        # Greed Index
        report.append("😈 GREED INDEX")
        report.append("-" * 80)
        greed_index, greed_level = self.calculate_greed_index()
        stakes = [self.parse_stake_return(bet.get('total_stake', 0)) for bet in self.bets]
        min_stake = min(stakes) if stakes else 0
        max_stake = max(stakes) if stakes else 0
        
        report.append(f"Greed Index: {greed_index:.2f}/10")
        report.append(f"Level: {greed_level}")
        report.append(f"Smallest Bet: ₦{min_stake:,.2f}")
        report.append(f"Largest Bet: ₦{max_stake:,.2f}")
        if min_stake > 0:
            report.append(f"Bet Size Ratio: {max_stake/min_stake:.1f}x")
        report.append("")

        # Loss Chasing
        report.append("🏃 LOSS CHASING ANALYSIS")
        report.append("-" * 80)
        chasing = self.detect_chasing_losses()
        report.append(f"Loss Chasing Detected: {'YES ⚠️' if chasing['chasing_detected'] else 'NO ✓'}")
        report.append(f"Chasing Events: {chasing['total_chasing_events']}")
        report.append(f"Severity: {chasing['severity']}")
        
        if chasing['chasing_events']:
            report.append("\nTop Chasing Events:")
            for i, event in enumerate(chasing['chasing_events'][:5], 1):
                report.append(f"  {i}. After {event['after_losses']} losses: "
                            f"₦{event['previous_stake']:.2f} → ₦{event['next_stake']:.2f} "
                            f"(+{event['increase_percent']:.1f}%)")
        report.append("")

        # Bankroll Status
        report.append("🏦 BANKROLL STATUS")
        report.append("-" * 80)
        bankroll = self.calculate_bankroll_status()
        report.append(f"Total Staked: ₦{bankroll['total_staked']:,.2f}")
        report.append(f"Total Returned: ₦{bankroll['total_returned']:,.2f}")
        report.append(f"Net Profit/Loss: ₦{bankroll['net_profit_loss']:,.2f}")
        report.append(f"Bankroll Remaining: {bankroll['bankroll_remaining_percent']:.2f}%")
        report.append(f"Daily Burn Rate: ₦{bankroll['daily_burn_rate']:,.2f}/day")
        report.append(f"Sustainability: {bankroll['sustainability']}")
        report.append("")

        # Kelly Criterion
        report.append("📐 KELLY CRITERION")
        report.append("-" * 80)
        kelly = self.calculate_kelly_criterion()
        report.append(f"Kelly Fraction: {kelly['kelly_percentage']:.2f}%")
        report.append(f"Average Odds: {kelly['average_odds']:.2f}")
        report.append(f"Win Probability: {kelly['win_probability']:.2f}%")
        report.append(f"Loss Probability: {kelly['loss_probability']:.2f}%")
        report.append(f"Expected Value: {kelly['expected_value']}")
        report.append(f"Recommendation: {kelly['recommendation']}")
        report.append("")

        # Summary
        report.append("=" * 80)
        report.append("📋 SUMMARY & RECOMMENDATIONS")
        report.append("=" * 80)
        
        if roi < -50:
            report.append("🔴 CRITICAL: You are in severe losses. Stop betting immediately.")
        elif roi < -20:
            report.append("🟠 WARNING: Significant losses detected. Reassess your strategy.")
        elif roi < 0:
            report.append("🟡 CAUTION: Negative ROI. Consider taking a break.")
        else:
            report.append("🟢 POSITIVE: You are profitable. Continue with discipline.")
        
        if chasing['chasing_detected']:
            report.append("🏃 ALERT: Loss chasing behavior detected. This is a major risk factor.")
        
        if greed_index > 6:
            report.append("😈 ALERT: High greed index. Reduce bet sizes and maintain discipline.")
        
        if kelly['kelly_fraction'] < 0:
            report.append("❌ CRITICAL: Negative Kelly Criterion. Do not bet with current win rate.")
        
        report.append("\n" + "=" * 80 + "\n")
        
        return "\n".join(report)

    def save_report(self, output_file: str = None):
        """Save report to file"""
        if output_file is None:
            output_file = f"bet_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        report = self.generate_report()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"✅ Report saved to: {output_file}")
        return output_file

    def export_metrics_json(self, output_file: str = None) -> str:
        """Export all metrics as JSON"""
        if output_file is None:
            output_file = f"bet_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        metrics = {
            'analysis_date': datetime.now().isoformat(),
            'total_bets': len(self.bets),
            'won_bets': len(self.get_won_bets()),
            'lost_bets': len(self.get_lost_bets()),
            'pending_bets': len(self.get_pending_bets()),
            'cancelled_bets': len(self.get_cancelled_bets()),
            'stakes_and_returns': {
                'total_stake': self.get_total_stakes(),
                'total_return': self.get_total_returns(),
                'net_profit_loss': self.get_total_returns() - self.get_total_stakes(),
            },
            'rates': {
                'win_rate_percent': self.calculate_win_rate(),
                'loss_rate_percent': self.calculate_loss_rate(),
                'roi_percent': self.calculate_roi(),
            },
            'averages': {
                'average_stake': self.calculate_average_stake(),
                'average_return': self.calculate_average_return(),
                'average_win': self.calculate_average_win(),
                'average_loss': self.calculate_average_loss(),
            },
            'date_range': {
                'earliest_bet': self.get_date_range()[0],
                'latest_bet': self.get_date_range()[1],
                'days_span': self.get_date_range()[2],
            },
            'greed_index': {
                'score': self.calculate_greed_index()[0],
                'level': self.calculate_greed_index()[1],
            },
            'loss_chasing': self.detect_chasing_losses(),
            'bankroll': self.calculate_bankroll_status(),
            'kelly_criterion': self.calculate_kelly_criterion(),
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Metrics exported to: {output_file}")
        return output_file


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Analyze SportyBet betting data from JSON file'
    )
    parser.add_argument(
        'json_file',
        help='Path to the JSON file containing bet data'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Generate and save text report'
    )
    parser.add_argument(
        '--metrics',
        action='store_true',
        help='Export metrics as JSON'
    )
    parser.add_argument(
        '--output',
        help='Output file path (for report or metrics)'
    )
    
    args = parser.parse_args()
    
    # Create analyzer
    analyzer = BetAnalyzer(args.json_file)
    
    # Print report to console
    print(analyzer.generate_report())
    
    # Save report if requested
    if args.report:
        analyzer.save_report(args.output)
    
    # Export metrics if requested
    if args.metrics:
        analyzer.export_metrics_json(args.output)


if __name__ == '__main__':
    main()