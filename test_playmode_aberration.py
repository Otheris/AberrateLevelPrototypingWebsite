import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context(record_video_dir="/home/jules/verification/videos")
    page = context.new_page()

    try:
        page.goto("http://127.0.0.1:5500")
        time.sleep(1) # wait for page load

        # Dismiss instructions modal if present
        page.evaluate("document.getElementById('closeTutorialBtn')?.click()")
        time.sleep(0.5)

        # 1. Place a button
        page.evaluate("document.querySelector('[data-tool=\"entity\"]').click()")
        page.evaluate("document.querySelector('.entity-btn[data-entity=\"button\"]').click()")

        # Click on canvas to place button
        page.mouse.click(200, 200)
        time.sleep(0.5)

        # 2. Add recipe: Red -> Blue (via js)
        page.evaluate("""
            const state = window.__EDITOR_STATE__; // wait is it exposed? We can add recipe via ui instead.
        """)

        page.evaluate("document.getElementById('recipesBtn').click()")
        page.evaluate("document.getElementById('addRecipeBtn').click()")
        # we can modify inputs via DOM
        page.evaluate("""
            const inputsInput = document.querySelector('#recipesList .recipe-row:last-child .recipe-inputs-input');
            const outputsInput = document.querySelector('#recipesList .recipe-row:last-child .recipe-outputs-input');
            if (inputsInput && outputsInput) {
                inputsInput.value = 'White';
                outputsInput.value = 'Blue';
                inputsInput.dispatchEvent(new Event('input'));
                outputsInput.dispatchEvent(new Event('input'));
            }
            document.getElementById('closeRecipesBtn').click();
        """)
        time.sleep(0.5)

        # Now place a White box
        page.evaluate("document.querySelector('.entity-btn[data-entity=\"box\"]').click()")

        # Click perfectly on top of the button
        page.mouse.click(200, 200)
        time.sleep(0.5)

        # Switch to play mode
        page.evaluate("document.getElementById('playModeBtn').click()")

        # In playmode, press 'r' to aberrate.
        # Initially cube is overlapping button -> button powered.

        # Check initial state visually
        time.sleep(1)
        os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
        page.screenshot(path="/home/jules/verification/screenshots/initial.png")

        # Press R to aberrate (cube splits into Blue cube at offset, parent inactive)
        # the parent is inactiveChild, the child is normal.
        page.keyboard.press("r")
        time.sleep(1)
        page.screenshot(path="/home/jules/verification/screenshots/aberrated.png")

        # Press R again to restore parent
        page.keyboard.press("r")
        time.sleep(1)
        page.screenshot(path="/home/jules/verification/screenshots/restored.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
