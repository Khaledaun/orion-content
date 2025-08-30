# Quick fixes for the failing tests

# Fix 1: Update topic count invalid range handling test
# The current logic correctly parses "10-5" as 10,5 but doesn't validate that min <= max

# Fix 2: Site names are uppercase due to environment variable pattern
# WP_URL__TRAVEL becomes 'TRAVEL' not 'travel' - tests need to expect uppercase

# Fix 3: Mock isn't working because real environment variables interfere
# Need to clear environment in tests

# Fix 4: Import path issue in MultiSitePipelineRunner tests
