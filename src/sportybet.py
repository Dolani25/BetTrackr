"""
SportyBet Bet History Scraper - OPTIMIZED VERSION
Complete standalone script for Windows/Mac/Linux
Run: python sportybet_scraper.py
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


class SportyBetScraper:
    """Main scraper class for SportyBet bet history"""
    
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.base_url = "https://www.sportybet.com/ng"
        self.bet_history_url = "https://www.sportybet.com/ng/my_accounts/bet_history/sport_bets?isSettled=10"
        self.all_bets = []
        self.max_retries = 3  # REDUCED from 7
        self.base_delay = 2  # REDUCED from 8
        self.last_successful_page = 1
        self.output_dir = Path("sportybet_data")
        self.output_dir.mkdir(exist_ok=True)
        self.last_rate_limit_check = 0  # Track last rate limit check time

    async def run(self) -> list:
        """Main method to run the scraper"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=False,
                slow_mo=100,  # REDUCED from 200
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
                print("🚀 SPORTYBET BET HISTORY SCRAPER - OPTIMIZED")
                print("="*70)
                
                print("\n📍 Step 1: Navigating to SportyBet...")
                await page.goto(self.base_url, wait_until='domcontentloaded', timeout=20000)  # CHANGED
                await self.random_delay(1, 2)  # REDUCED

                print("📍 Step 2: Logging in...")
                await self.login(page)

                print("📍 Step 3: Navigating to bet history...")
                await self.navigate_to_bet_history(page)

                print("📍 Step 4: Scraping bet data...")
                await self.scrape_all_bet_pages_improved(page)

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

    async def random_delay(self, min_seconds: float = 1, max_seconds: float = 3):  # REDUCED defaults
        """Add random delay to mimic human behavior"""
        delay = random.uniform(min_seconds, max_seconds)
        print(f"   ⏳ Waiting {delay:.1f}s...")
        await asyncio.sleep(delay)

    async def check_rate_limit(self, page) -> bool:
        """Check if we've hit rate limiting - IMPROVED to be more specific"""
        try:
            # Add cooldown to avoid checking too frequently
            current_time = datetime.now().timestamp()
            if current_time - self.last_rate_limit_check < 2:
                return False
            self.last_rate_limit_check = current_time

            # Only check for SPECIFIC SportyBet rate limit messages
            rate_limit_text = await page.text_content('body')
            if rate_limit_text:
                rate_limit_lower = rate_limit_text.lower()
                # More specific phrases that indicate actual rate limiting
                if any(phrase in rate_limit_lower for phrase in [
                    'rate limit',
                    'too many requests',
                    'please try again later',
                    'temporarily unavailable'
                ]):
                    return True

            # Check for specific rate limit error elements (be very specific)
            try:
                # Look for actual error messages, not generic alerts
                error_element = await page.query_selector('[class*="error-message"], [class*="rate-limit"], [data-error="rate-limit"]')
                if error_element:
                    error_text = await error_element.text_content()
                    if error_text and any(phrase in error_text.lower() for phrase in ['rate', 'limit', 'too many']):
                        return True
            except:
                pass

        except:
            pass
        return False

    async def handle_rate_limit(self, page, current_page: int, attempt: int = 1) -> int:
        """Handle rate limiting with REDUCED wait times"""
        print(f"   ⚠️  Rate limit detected on page {current_page}! Attempt {attempt}/{self.max_retries}")

        if attempt > self.max_retries:
            raise Exception("Max retries exceeded for rate limiting")

        # REDUCED exponential backoff: 2, 4, 8 seconds instead of 8, 16, 32...
        delay = self.base_delay * (2 ** (attempt - 1)) + random.uniform(1, 3)
        print(f"   ⏳ Waiting {delay:.1f}s before recovery...")
        await asyncio.sleep(delay)

        try:
            target_page = self.last_successful_page
            target_url = f"https://www.sportybet.com/ng/my_accounts/bet_history/sport_bets?page={target_page}&isSettled=10"

            print(f"   🔄 Recovering to page {target_page}...")
            await page.goto(target_url, wait_until='domcontentloaded', timeout=10000)  # CHANGED
            await asyncio.sleep(1)  # REDUCED from 2

            if await self.check_rate_limit(page):
                print(f"   ⚠️  Still rate limited, retrying...")
                return await self.handle_rate_limit(page, current_page, attempt + 1)

            print(f"   ✅ Recovered to page {target_page}")
            return target_page

        except Exception as e:
            print(f"   ❌ Recovery failed: {str(e)}")
            return await self.handle_rate_limit(page, current_page, attempt + 1)

    async def login(self, page):
        """Handle login process"""
        try:
            # Wait for login form
            await page.wait_for_selector(
                'input[name="mobile_number"], input[placeholder*="Mobile"], input[type="text"]',
                timeout=10000
            )
            
            # Find and fill mobile input
            mobile_selectors = [
                'input[name="mobile_number"]',
                'input[placeholder*="Mobile"]',
                'input[placeholder*="mobile"]',
                'input[type="text"]'
            ]
            
            mobile_selector = None
            for selector in mobile_selectors:
                try:
                    if await page.query_selector(selector):
                        mobile_selector = selector
                        print(f"   ✓ Found mobile input")
                        break
                except:
                    pass
            
            if not mobile_selector:
                raise Exception("Could not find mobile input field")
            
            await page.fill(mobile_selector, self.username)
            await self.random_delay(0.5, 1)  # REDUCED

            # Find and fill password input
            password_selectors = [
                'input[name="password"]',
                'input[placeholder*="Password"]',
                'input[placeholder*="password"]',
                'input[type="password"]'
            ]
            
            password_selector = None
            for selector in password_selectors:
                try:
                    if await page.query_selector(selector):
                        password_selector = selector
                        print(f"   ✓ Found password input")
                        break
                except:
                    pass
            
            if not password_selector:
                raise Exception("Could not find password input field")
            
            await page.fill(password_selector, self.password)
            await self.random_delay(0.5, 1)  # REDUCED

            # Click login button
            login_button_selectors = [
                'button:has-text("Login")',
                'button:has-text("login")',
                'button[type="submit"]',
                'text="Login"'
            ]
            
            for selector in login_button_selectors:
                try:
                    if await page.query_selector(selector):
                        await page.click(selector)
                        print(f"   ✓ Clicked login button")
                        break
                except:
                    pass

            # Wait for successful login
            await page.wait_for_selector('text="My Account"', timeout=15000)
            await self.random_delay(1, 2)  # REDUCED

            print("   ✅ Login successful!")
        except Exception as e:
            print(f"   ❌ Login failed: {str(e)}")
            await self.save_error_screenshot(page, "login_error")
            raise e

    async def navigate_to_bet_history(self, page):
        """Navigate to bet history page"""
        try:
            await page.goto(self.bet_history_url, wait_until='domcontentloaded', timeout=15000)  # CHANGED
            
            # Wait for page to load
            selectors_to_wait = [
                'text="Sport Bets"',
                'text="Bet History"',
                '[class*="bet"]',
                'body'
            ]
            
            for selector in selectors_to_wait:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    print(f"   ✓ Page loaded")
                    break
                except:
                    pass
            
            await self.random_delay(0.5, 1)  # REDUCED
            print("   ✅ Navigated to bet history page!")
        except Exception as e:
            print(f"   ❌ Navigation failed: {str(e)}")
            await self.save_error_screenshot(page, "bet_history_error")
            raise e

    async def scrape_all_bet_pages_improved(self, page):
        """Improved pagination scraping with URL-based rate limit handling"""
        current_page = 1
        max_pages = 400
        consecutive_failures = 0
        max_consecutive_failures = 5  # REDUCED from 7

        print(f"\n   📄 Starting pagination scraping (max {max_pages} pages)...\n")

        while current_page <= max_pages and consecutive_failures < max_consecutive_failures:
            print(f"   📖 Page {current_page}...", end=" ")

            if await self.check_rate_limit(page):
                recovered_page = await self.handle_rate_limit(page, current_page)
                if recovered_page:
                    current_page = recovered_page
                    continue
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        print("Failed to recover from rate limiting, stopping...")
                        break
                    continue

            try:
                page_bets = await self.scrape_current_page_with_retry(page)

                if not page_bets:
                    consecutive_failures += 1
                    print(f"❌ No bets ({consecutive_failures}/{max_consecutive_failures})")

                    if consecutive_failures >= max_consecutive_failures:
                        print("   ⚠️  Too many consecutive failures, stopping...")
                        break
                else:
                    consecutive_failures = 0
                    self.all_bets.extend(page_bets)
                    self.last_successful_page = current_page
                    print(f"✅ Found {len(page_bets)} bets (Total: {len(self.all_bets)})")

                if current_page < max_pages:
                    next_page = current_page + 1
                    await self.random_delay(0.3, 0.8)  # REDUCED

                    if await self.navigate_to_next_page(page, next_page):
                        current_page = next_page
                    else:
                        print(f"   ⚠️  Could not navigate to page {next_page}, stopping...")
                        break
                else:
                    break

            except Exception as e:
                print(f"❌ Error: {str(e)}")
                consecutive_failures += 1

                if consecutive_failures >= max_consecutive_failures:
                    break

                await self.random_delay(3, 5)  # REDUCED from 10-20

    async def navigate_to_next_page(self, page, next_page: int) -> bool:
        """Navigate to next page using pagination"""
        for attempt in range(self.max_retries):
            try:
                if await self.check_rate_limit(page):
                    recovered_page = await self.handle_rate_limit(page, next_page, attempt + 1)
                    if recovered_page:
                        return recovered_page == next_page
                    continue

                # Try clicking pagination button
                next_page_selector = f'text="{next_page}"'

                try:
                    await page.wait_for_selector(next_page_selector, timeout=3000)  # REDUCED
                    await page.click(next_page_selector)
                except:
                    # If button click fails, try URL navigation
                    await page.goto(
                        f"https://www.sportybet.com/ng/my_accounts/bet_history/sport_bets?page={next_page}&isSettled=10",
                        wait_until='domcontentloaded',  # CHANGED
                        timeout=8000  # REDUCED
                    )

                await page.wait_for_load_state('domcontentloaded', timeout=5000)  # CHANGED and REDUCED
                await asyncio.sleep(0.5)  # REDUCED from 2

                if not await self.check_rate_limit(page):
                    return True
                else:
                    continue

            except Exception as e:
                if attempt < self.max_retries - 1:
                    await self.random_delay(1, 2)  # REDUCED

        return False

    async def scrape_current_page_with_retry(self, page) -> list:
        """Scrape current page with retry logic"""
        for attempt in range(self.max_retries):
            try:
                if await self.check_rate_limit(page):
                    continue

                # Wait for bet data to load
                selectors_to_wait = [
                    'text="Multiple"',
                    'text="Single"',
                    '[class*="bet"]',
                    'body'
                ]
                
                for selector in selectors_to_wait:
                    try:
                        await page.wait_for_selector(selector, timeout=3000)  # REDUCED
                        break
                    except:
                        pass

                page_text = await page.inner_text('body')
                bets = self.parse_bet_data_from_text(page_text)
                return bets

            except Exception as e:
                if attempt < self.max_retries - 1:
                    await self.random_delay(1, 2)  # REDUCED

        return []

    def parse_bet_data_from_text(self, text: str) -> list:
        """Parse bet data from page text content"""
        bets = []
        try:
            lines = text.split('\n')
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                date_match = re.match(r'(\d{2}/\d{2}/\d{4} \d{2}:\d{2})', line)
                if date_match:
                    bet_data = {
                        'date_time': date_match.group(1),
                        'bet_type': '',
                        'status': '',
                        'matches': [],
                        'total_stake': 0.0,
                        'total_return': 0.0,
                        'additional_info': '',
                        'odds': None,
                        'bet_id': None
                    }

                    j = i + 1
                    while j < len(lines) and j < i + 30:
                        next_line = lines[j].strip()
                        if next_line in ['Multiple', 'Single']:
                            bet_data['bet_type'] = next_line
                        elif next_line in ['Lost', 'Won', 'Pending', 'Cancelled']:
                            bet_data['status'] = next_line
                        elif 'v' in next_line and len(next_line.split('v')) == 2:
                            bet_data['matches'].append(next_line)
                        elif next_line == 'Total Stake' and j + 1 < len(lines):
                            try:
                                stake_value = lines[j + 1].strip().replace(',', '')
                                bet_data['total_stake'] = float(stake_value)
                            except:
                                pass
                        elif next_line == 'Total Return' and j + 1 < len(lines):
                            try:
                                return_value = lines[j + 1].strip().replace(',', '')
                                bet_data['total_return'] = float(return_value)
                            except:
                                pass
                        elif 'and' in next_line and 'other matches' in next_line:
                            bet_data['additional_info'] = next_line
                        elif 'Flexi' in next_line:
                            bet_data['additional_info'] = next_line

                        if re.match(r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}', next_line):
                            break
                        j += 1

                    if bet_data['bet_type'] and bet_data['status']:
                        bet_data['profit_loss'] = bet_data['total_return'] - bet_data['total_stake']
                        bets.append(bet_data)
                    i = j - 1
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
                'last_successful_page': self.last_successful_page
            }

            final_data = {
                'summary': summary,
                'bets': self.all_bets
            }

            filename = self.output_dir / f'sportybet_history_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)

            print(f"\n📊 SUMMARY:")
            print(f"   Total Bets: {summary['total_bets']}")
            print(f"   Won: {summary['won_bets']} | Lost: {summary['lost_bets']}")
            print(f"   Win Rate: {summary['win_rate']:.2f}%")
            print(f"   Total Stake: ₦{summary['total_stake']:,.2f}")
            print(f"   Total Return: ₦{summary['total_return']:,.2f}")
            print(f"   Profit/Loss: ₦{summary['total_profit_loss']:,.2f}")

            return str(filename)

        except Exception as e:
            print(f"Error saving data: {str(e)}")
            return None

    async def save_error_screenshot(self, page, name: str = "error"):
        """Save error screenshot for debugging"""
        try:
            screenshot_path = self.output_dir / f'{name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
            await page.screenshot(path=str(screenshot_path))
            print(f"   📸 Screenshot saved: {screenshot_path}")
        except:
            pass


async def main():
    """Main entry point"""
    # ⚠️ CHANGE THESE CREDENTIALS TO YOUR OWN
    USERNAME = "7068639238"
    PASSWORD = "Harkins20"
    
    scraper = SportyBetScraper(USERNAME, PASSWORD)
    try:
        await scraper.run()
    except Exception as e:
        print(f"\n❌ Scraping failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    print("\n" + "="*70)
    print("SPORTYBET BET HISTORY SCRAPER - OPTIMIZED VERSION")
    print("="*70)
    print("\n⚠️  IMPORTANT: Update your credentials in the script before running!")
    print("   Find the USERNAME and PASSWORD variables in the main() function\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Scraping interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)
