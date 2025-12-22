"""
Bet9ja Bet History Scraper - COMPLETE FIXED VERSION
Complete standalone script for Windows/Mac/Linux
Run: python bet9ja_scraper.py
"""

import asyncio
import json
import re
import random
import sys
import os
from datetime import datetime
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("Install it with: pip install playwright")
    sys.exit(1)

class Bet9jaScraper:
    """Main scraper class for Bet9ja bet history"""
    
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.base_url = "https://sports.bet9ja.com"
        self.all_bets = []
        self.max_retries = 3
        self.base_delay = 2
        self.last_successful_page = 1
        self.output_dir = Path("bet9ja_data")
        self.output_dir.mkdir(exist_ok=True)
        self.last_rate_limit_check = 0

    async def run(self) -> list:
        """Main method to run the scraper"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=False,
                slow_mo=100,
                devtools=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            )
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            """)
            
            try:
                print("\n" + "="*70)
                print("🚀 BET9JA BET HISTORY SCRAPER - COMPLETE FIXED VERSION")
                print("="*70)
                print("\n📍 Step 1: Navigating to Bet9ja...")
                await page.goto(self.base_url, wait_until='domcontentloaded', timeout=20000)
                await self.random_delay(1, 2)
                
                print("📍 Step 2: Logging in...")
                await self.login(page)
                
                print("📍 Step 3: Navigating to bet history...")
                await self.navigate_to_bet_history(page)
                
                print("📍 Step 4: Scraping bet data...")
                await self.scrape_settled_bets(page)
                
                print("📍 Step 5: Saving data...")
                filename = await self.save_data_to_json()
                
                print("\n" + "="*70)
                print(f"✅ SUCCESS! Scraped {len(self.all_bets)} bets")
                print(f"📁 Data saved to: {filename}")
                print("="*70 + "\n")
                return self.all_bets
                
            except Exception as e:
                print(f"\n❌ ERROR: {str(e)}")
                await self.save_error_screenshot(page)
                raise e
            finally:
                await browser.close()

    async def random_delay(self, min_seconds: float = 1, max_seconds: float = 3):
        """Add random delay to mimic human behavior"""
        delay = random.uniform(min_seconds, max_seconds)
        print(f" ⏳ Waiting {delay:.1f}s...")
        await asyncio.sleep(delay)

    async def login(self, page):
        """Handle login process for Bet9ja"""
        try:
            # Wait for and click the Login link (not a button)
            await page.wait_for_selector('text="Login"', timeout=10000)
            await page.click('text="Login"')
            await self.random_delay(1, 2)
            
            # Wait for login form to appear
            await page.wait_for_selector(
                'input[placeholder*="Mobile"]',
                timeout=10000
            )
            
            # Find and fill username/mobile input
            username_selectors = [
                'input[placeholder*="Mobile Number or Username"]',
                'input[placeholder*="Mobile"]',
                'input[type="text"]'
            ]
            username_selector = None
            for selector in username_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        username_selector = selector
                        print(f" ✓ Found username input")
                        break
                except:
                    pass
            
            if not username_selector:
                raise Exception("Could not find username input field")
            
            await page.fill(username_selector, self.username)
            await self.random_delay(0.5, 1)
            
            # Find and fill password input
            password_selectors = [
                'input[placeholder*="Password"]',
                'input[type="password"]'
            ]
            password_selector = None
            for selector in password_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        password_selector = selector
                        print(f" ✓ Found password input")
                        break
                except:
                    pass
            
            if not password_selector:
                raise Exception("Could not find password input field")
            
            await page.fill(password_selector, self.password)
            await self.random_delay(0.5, 1)
            
            # Click Log In button in modal
            await page.wait_for_selector('button:has-text("Log In")', timeout=5000)
            await page.click('button:has-text("Log In")')
            print(f" ✓ Clicked login button")
            
            # Wait for successful login - look for My Account button
            await page.wait_for_selector('text="My Account"', timeout=15000)
            await self.random_delay(1, 2)
            print(" ✅ Login successful!")
            
        except Exception as e:
            print(f" ❌ Login failed: {str(e)}")
            await self.save_error_screenshot(page, "login_error")
            raise e

    async def navigate_to_bet_history(self, page):
        """Navigate to bet history page"""
        try:
            # Click on My Sports Bets link
            await page.wait_for_selector('text="My Sports Bets"', timeout=10000)
            await page.click('text="My Sports Bets"')
            await self.random_delay(1, 2)
            
            # Wait for MY BETS section to load
            await page.wait_for_selector('text="MY BETS"', timeout=10000)
            await self.random_delay(0.5, 1)
            
            # Click on Settled Bets tab
            await page.click('text="Settled Bets"')
            await self.random_delay(1, 2)
            
            print(" ✅ Navigated to bet history page!")
            
        except Exception as e:
            print(f" ❌ Navigation failed: {str(e)}")
            await self.save_error_screenshot(page, "bet_history_error")
            raise e

    async def scrape_settled_bets(self, page):
        """Scrape settled bets from the page"""
        try:
            print(f"\n 📄 Scraping settled bets...\n")
            
            # Try to change date filter to see all bets
            await self.change_date_filter(page)
            
            # Wait for bets to load
            await self.random_delay(2, 3)
            
            # Get page content
            page_text = await page.inner_text('body')
            bets = self.parse_bet_data_from_text(page_text)
            
            if bets:
                self.all_bets.extend(bets)
                print(f"✅ Found {len(bets)} bets")
            else:
                print("⚠️ No bets found on this page")
                
        except Exception as e:
            print(f"❌ Error scraping bets: {str(e)}")

    async def change_date_filter(self, page):
        """Change date filter to show all bets"""
        try:
            # Look for the date filter button/icon
            date_buttons = await page.query_selector_all('button')
            
            for button in date_buttons:
                try:
                    text = await button.text_content()
                    if text and ('Last 24 Hours' in text or 'Date' in text):
                        await button.click()
                        await self.random_delay(0.5, 1)
                        break
                except:
                    pass
            
            # Wait for dropdown to appear
            await self.random_delay(0.5, 1)
            
            # Try to find and click on "All" or longer period option
            try:
                all_options = await page.query_selector_all('[role="option"]')
                for option in all_options:
                    try:
                        text = await option.text_content()
                        if text and ('All' in text or 'All Time' in text or 'Last 7' in text or 'Last 30' in text):
                            await option.click()
                            await self.random_delay(0.5, 1)
                            break
                    except:
                        pass
            except:
                pass
            
            # Click Update Results button if it exists
            try:
                update_buttons = await page.query_selector_all('button')
                for button in update_buttons:
                    try:
                        text = await button.text_content()
                        if text and 'Update Results' in text:
                            await button.click()
                            await self.random_delay(1, 2)
                            break
                    except:
                        pass
            except:
                pass
                    
        except Exception as e:
            print(f" ⚠️ Could not change date filter: {str(e)}")

    def parse_bet_data_from_text(self, text: str) -> list:
        """Parse bet data from page text content"""
        bets = []
        try:
            lines = text.split('\n')
            i = 0
            
            while i < len(lines):
                line = lines[i].strip()
                
                # Look for bet type indicators (Multiple, Single)
                if line in ['Multiple', 'Single']:
                    bet_data = {
                        'bet_type': line,
                        'date_time': '',
                        'status': '',
                        'matches': [],
                        'total_stake': 0.0,
                        'total_return': 0.0,
                        'additional_info': '',
                        'odds': None,
                        'bet_id': None
                    }
                    
                    # Look backwards for date/time
                    for j in range(i-1, max(0, i-10), -1):
                        prev_line = lines[j].strip()
                        # Match various date formats
                        date_match = re.match(r'(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2})', prev_line)
                        if date_match:
                            bet_data['date_time'] = date_match.group(1)
                            break
                    
                    # Look forward for bet details
                    j = i + 1
                    while j < len(lines) and j < i + 50:
                        next_line = lines[j].strip()
                        
                        if next_line in ['Lost', 'Won', 'Pending', 'Cancelled']:
                            bet_data['status'] = next_line
                        elif 'v' in next_line and len(next_line.split('v')) == 2:
                            bet_data['matches'].append(next_line)
                        elif next_line == 'Stake:' and j + 1 < len(lines):
                            try:
                                stake_value = lines[j + 1].strip().replace(',', '').replace('₦', '').strip()
                                bet_data['total_stake'] = float(stake_value)
                            except:
                                pass
                        elif 'To Win:' in next_line or 'Return:' in next_line:
                            try:
                                return_value = next_line.split(':')[1].strip().replace(',', '').replace('₦', '').strip()
                                bet_data['total_return'] = float(return_value)
                            except:
                                pass
                        elif 'Cashout' in next_line:
                            bet_data['additional_info'] = next_line
                        elif 'and' in next_line and 'other' in next_line:
                            bet_data['additional_info'] = next_line
                        
                        # Stop if we hit another bet type
                        if (next_line in ['Multiple', 'Single'] and j > i + 1):
                            break
                        
                        j += 1
                    
                    if bet_data['bet_type'] and bet_data['status']:
                        bet_data['profit_loss'] = bet_data['total_return'] - bet_data['total_stake']
                        bets.append(bet_data)
                
                i += 1
                
        except Exception as e:
            print(f"Error parsing bet data: {str(e)}")
        
        return bets

    async def save_data_to_json(self) -> str:
        """Save scraped data to JSON file"""
        try:
            total_stake = sum(bet.get('total_stake', 0) for bet in self.all_bets)
            total_return = sum(bet.get('total_return', 0) for bet in self.all_bets)
            won_bets = [bet for bet in self.all_bets if bet.get('status') == 'Won']
            lost_bets = [bet for bet in self.all_bets if bet.get('status') == 'Lost']
            
            summary = {
                'scrape_date': datetime.now().isoformat(),
                'total_bets': len(self.all_bets),
                'total_stake': total_stake,
                'total_return': total_return,
                'total_profit_loss': total_return - total_stake,
                'won_bets': len(won_bets),
                'lost_bets': len(lost_bets),
                'win_rate': len(won_bets) / len(self.all_bets) * 100 if self.all_bets else 0,
                'average_stake': total_stake / len(self.all_bets) if self.all_bets else 0,
            }
            
            final_data = {
                'summary': summary,
                'bets': self.all_bets
            }
            
            filename = self.output_dir / f'bet9ja_history_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📊 SUMMARY:")
            print(f" Total Bets: {summary['total_bets']}")
            print(f" Won: {summary['won_bets']} | Lost: {summary['lost_bets']}")
            print(f" Win Rate: {summary['win_rate']:.2f}%")
            print(f" Total Stake: ₦{summary['total_stake']:,.2f}")
            print(f" Total Return: ₦{summary['total_return']:,.2f}")
            print(f" Profit/Loss: ₦{summary['total_profit_loss']:,.2f}")
            
            return str(filename)
            
        except Exception as e:
            print(f"Error saving data: {str(e)}")
            return None

    async def save_error_screenshot(self, page, name: str = "error"):
        """Save error screenshot for debugging"""
        try:
            screenshot_path = self.output_dir / f'{name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
            await page.screenshot(path=str(screenshot_path))
            print(f" 📸 Screenshot saved: {screenshot_path}")
        except:
            pass


async def main():
    """Main entry point"""
    # ⚠️ CHANGE THESE CREDENTIALS TO YOUR OWN
    USERNAME = "Dolani767"
    PASSWORD = "Harkins20"
    
    scraper = Bet9jaScraper(USERNAME, PASSWORD)
    try:
        await scraper.run()
    except Exception as e:
        print(f"\n❌ Scraping failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    print("\n" + "="*70)
    print("BET9JA BET HISTORY SCRAPER - COMPLETE FIXED VERSION")
    print("="*70)
    print("\n⚠️ IMPORTANT: Update your credentials in the script before running!")
    print(" Find the USERNAME and PASSWORD variables in the main() function\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Scraping interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)