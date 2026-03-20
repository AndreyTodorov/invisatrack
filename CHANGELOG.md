## [1.17.1](https://github.com/AndreyTodorov/invisatrack/compare/v1.17.0...v1.17.1) (2026-03-20)


### Bug Fixes

* make modal sheets scroll reliably on iOS Safari ([4a13a55](https://github.com/AndreyTodorov/invisatrack/commit/4a13a55fe7675f826c019d9d64063ff9196095d7))

# [1.17.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.16.0...v1.17.0) (2026-03-20)


### Bug Fixes

* constrain bottom sheet modals to viewport height on mobile ([efaf128](https://github.com/AndreyTodorov/invisatrack/commit/efaf128353d9e83517605bf8ef72523dd911283f))
* session edit timezone round-trip, close animation, delete button hit target ([f88fba4](https://github.com/AndreyTodorov/invisatrack/commit/f88fba41f621737d5c7bd668dbaefad15bc6fbd1))


### Features

* add period navigation (offset state, NavRow, getDateRange update) ([5cf9e25](https://github.com/AndreyTodorov/invisatrack/commit/5cf9e25ac51aa215bb811edac8df4255494b6184))
* pass periodLabel as prop to WearChart, update empty-state message ([c92f362](https://github.com/AndreyTodorov/invisatrack/commit/c92f3620097b302246999878ab4d40cebac4e426))
* **reports:** period navigation, heatmap sync, and calendar date labels ([d6a8e66](https://github.com/AndreyTodorov/invisatrack/commit/d6a8e66e761bc0c02e4b80c30dffbd4865940453))

# [1.16.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.15.0...v1.16.0) (2026-03-20)


### Features

* add dev seed script with auto-reload and seed user sign-in ([11dcb55](https://github.com/AndreyTodorov/invisatrack/commit/11dcb55d64fd4327742aee315d5aa98756b95aa7))

# [1.15.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.14.0...v1.15.0) (2026-03-20)


### Features

* add DevBanner component with title prefix ([4812075](https://github.com/AndreyTodorov/invisatrack/commit/4812075d28ce676724c0219eebe1ab41a0bb1e2a))
* mount DevBanner in AppShell ([117e5a7](https://github.com/AndreyTodorov/invisatrack/commit/117e5a7ba0dac5c269e9ed298c92b9d76a08b84c))

# [1.14.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.13.0...v1.14.0) (2026-03-20)


### Features

* smooth push/pop animations for settings navigation ([52da714](https://github.com/AndreyTodorov/invisatrack/commit/52da714c153d7b710599c0e2f2a091c5f89b5ead))

# [1.13.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.12.1...v1.13.0) (2026-03-20)


### Features

* settings nav list with profile card, swipe-back, and iOS safe area ([d908405](https://github.com/AndreyTodorov/invisatrack/commit/d908405d19c9fa5d3240617f9410be4d9d55d313))

## [1.12.1](https://github.com/AndreyTodorov/invisatrack/compare/v1.12.0...v1.12.1) (2026-03-19)


### Bug Fixes

* modal positioning, iOS safe area nav, and onboarding wear goal minutes ([988492a](https://github.com/AndreyTodorov/invisatrack/commit/988492a610326fc66aa20d6ed8ec8ed3ca6f5025))

# [1.12.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.11.1...v1.12.0) (2026-03-19)


### Features

* show app version and build date in settings ([c7864c0](https://github.com/AndreyTodorov/invisatrack/commit/c7864c06e47d0d53d2bd2464948ef85334371caf))

## [1.11.1](https://github.com/AndreyTodorov/invisatrack/compare/v1.11.0...v1.11.1) (2026-03-19)


### Bug Fixes

* **lint:** resolve all ESLint errors and warnings ([0c87115](https://github.com/AndreyTodorov/invisatrack/commit/0c87115cb0484447671dfa248996ef12e921ae11))

# [1.11.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.10.0...v1.11.0) (2026-03-19)


### Features

* **home:** show daily goal compliance heatmap in aligner set section ([8dcc84f](https://github.com/AndreyTodorov/invisatrack/commit/8dcc84f46f21ae7ca6e7db210c92ed362ddcccf2))
* **ui:** add swipe gesture navigation for Reports and History tabs ([8a6859f](https://github.com/AndreyTodorov/invisatrack/commit/8a6859f650394e1f2f5d87717375b70bada400a6))

# [1.10.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.9.1...v1.10.0) (2026-03-19)


### Bug Fixes

* **calendar:** increase touch area on nav buttons for mobile ([5bbe88c](https://github.com/AndreyTodorov/invisatrack/commit/5bbe88c73d6775bb73a851e95f274fd6dd345644))


### Features

* **calendar:** replace 3-month view with single-month + prev/next navigation ([1aaa22c](https://github.com/AndreyTodorov/invisatrack/commit/1aaa22c4667bec5e01625e481b755e2d7fb3d90c))
* **history:** add calendar heatmap, month grouping, filters, sticky headers, and wear bars ([349805f](https://github.com/AndreyTodorov/invisatrack/commit/349805f7b1d607657bd0aaac3007954c58e2e131))
* **reports:** move wear calendar to Reports > Month tab ([9c4565c](https://github.com/AndreyTodorov/invisatrack/commit/9c4565cfb84dd1e38975e62b8106b70db8987ce9))
* **reports:** persist selected tab to localStorage ([2930a18](https://github.com/AndreyTodorov/invisatrack/commit/2930a18a7a9cc53df2b0f68f555b3a452f67757c))
* **ui:** add directional slide animations on tab transitions in Reports and History ([c0d5db4](https://github.com/AndreyTodorov/invisatrack/commit/c0d5db425ffd44d08d6656f227a1d1fa0c78021b))
* **ui:** smoother tab animations + directional slide on main nav transitions ([f712867](https://github.com/AndreyTodorov/invisatrack/commit/f712867d29bfe680a8173edccbe8aef43ac79a3f))

## [1.9.1](https://github.com/AndreyTodorov/invisatrack/compare/v1.9.0...v1.9.1) (2026-03-19)


### Bug Fixes

* **dashboard:** calculate days left from end date instead of duration offset ([02ea742](https://github.com/AndreyTodorov/invisatrack/commit/02ea7423ac960ff3b57c1501d2c56520b774fa73))

# [1.9.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.8.0...v1.9.0) (2026-03-19)


### Bug Fixes

* **home:** add autoCap dismiss, clear lastSession on start, fix indentation ([d4eff55](https://github.com/AndreyTodorov/invisatrack/commit/d4eff55df49c4a7dd539da6eb65bff854d7cca36))


### Features

* **dashboard:** add interval for updating tick based on active minutes ([99e8306](https://github.com/AndreyTodorov/invisatrack/commit/99e8306379ab50da4967820f1530438768f9853d))
* **sessionValidation:** add future time validation for session start and end ([7bfadb3](https://github.com/AndreyTodorov/invisatrack/commit/7bfadb3d87a442e72aea666d7e921436792b97b8))

# [1.8.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.7.0...v1.8.0) (2026-03-19)


### Features

* **dashboard:** standardize segment color for wearing status in DailySummary ([736c8c7](https://github.com/AndreyTodorov/invisatrack/commit/736c8c771859907e1c1ce9feae83aa755d75194f))
* **timer:** simplify button text rendering for budget limit and aligners removal ([90fe037](https://github.com/AndreyTodorov/invisatrack/commit/90fe0377ff8075ca1936fc781ceb78a4462836e7))

# [1.7.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.6.0...v1.7.0) (2026-03-18)


### Features

* **dashboard:** add hour grid lines and now indicator to DailySummary ([564c361](https://github.com/AndreyTodorov/invisatrack/commit/564c36150441ecf100a66a3db6bee55df3d49457))
* **home:** improve today card, timer button, and treatment progress UI ([1364081](https://github.com/AndreyTodorov/invisatrack/commit/1364081ae3d8cb6ec328cffc2e57be8bbddac6d4))

# [1.6.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.5.0...v1.6.0) (2026-03-18)


### Features

* **reports:** add chart label, weekday x-axis, and h/m tooltip ([8d0a637](https://github.com/AndreyTodorov/invisatrack/commit/8d0a6373d5afe6956f9b53272c986ef1c62df82c))
* **reports:** green/rose tints and larger values on Best/Worst callout cards ([e76e2a7](https://github.com/AndreyTodorov/invisatrack/commit/e76e2a7ba671c3a13df4fbbe6302229d4e75ea77))
* **reports:** hero metric card with wear bar and 2-col secondary stats ([6fbbf44](https://github.com/AndreyTodorov/invisatrack/commit/6fbbf44f20008ba4c313fe3ac79690acc7f80cb0))
* **reports:** wear bar in hours and larger values in By Set cards ([2894d67](https://github.com/AndreyTodorov/invisatrack/commit/2894d67334ccb732c4c255ee4a2216e6a2bf7db0))

# [1.5.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.4.0...v1.5.0) (2026-03-18)


### Features

* add session tracking to DailySummary component and update HomeView to pass session data ([e09f3f1](https://github.com/AndreyTodorov/invisatrack/commit/e09f3f1d95bd99f3c88416b3e9a7943b81c9713c))
* update components to incorporate goalMinutes for improved wear tracking and reporting ([6e20fa8](https://github.com/AndreyTodorov/invisatrack/commit/6e20fa83fa37aec9bcd4047076ece7acae64b291))

# [1.4.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.3.0...v1.4.0) (2026-03-18)


### Features

* add drop shadow effect to wear ring in DailySummary component ([6242db7](https://github.com/AndreyTodorov/invisatrack/commit/6242db72f494421e2824bf54b77400d40fc01c69))

# [1.3.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.2.0...v1.3.0) (2026-03-18)


### Features

* add drop shadow effect to wear ring in DailySummary component ([84c6557](https://github.com/AndreyTodorov/invisatrack/commit/84c655743b2078431e2ee528dfe8eea933471811))

# [1.2.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.1.0...v1.2.0) (2026-03-18)


### Features

*  sync fixes for Firebase and IndexedDB, enhance offline behavior and conflict resolution ([e2849b0](https://github.com/AndreyTodorov/invisatrack/commit/e2849b0d5bf232ab581809ac99a3671fb8a800ab))
* add sync indicator pill to HomeView header ([d4bc9d3](https://github.com/AndreyTodorov/invisatrack/commit/d4bc9d34e17016542f444250b79827ed2b9011b2))
* enhance DataContext and HomeView for Firebase treatment loading state ([17f2cd6](https://github.com/AndreyTodorov/invisatrack/commit/17f2cd66a305cd4cde7350a50a3c6307fed246a5))
* enhance TimerButton with adaptive glow and hold functionality ([179de91](https://github.com/AndreyTodorov/invisatrack/commit/179de9154d85ae2f8e11bb1690dc3f3c1f349dac))

# [1.1.0](https://github.com/AndreyTodorov/invisatrack/compare/v1.0.0...v1.1.0) (2026-03-18)


### Features

* add average off minutes to reports and update related components ([6e676a3](https://github.com/AndreyTodorov/invisatrack/commit/6e676a3b8d889c3cfb42700687b9fff0a2e0793b))

# 1.0.0 (2026-03-18)


### Bug Fixes

* add error handling for IndexedDB ops in DataContext ([41d4b01](https://github.com/AndreyTodorov/invisatrack/commit/41d4b013f1d0747465b3751de7390c3324dc4efd))
* add error handling to handlePickCurrent in SetEditModal ([0524c49](https://github.com/AndreyTodorov/invisatrack/commit/0524c490fdb6802d82b7334faa04576ad3c569c1))
* add input[type=date] to global themed input styles ([a350d62](https://github.com/AndreyTodorov/invisatrack/commit/a350d62fe87fb52c488982085ca1ec047c3feb3d))
* advance treatment through pre-existing sets during auto-advance ([15c4b07](https://github.com/AndreyTodorov/invisatrack/commit/15c4b07703c17daefdaec86d98dcc3e546d4ef6e))
* **ci:** remove environment block from deploy job to fix lint error ([1c53f2a](https://github.com/AndreyTodorov/invisatrack/commit/1c53f2a4796038a3c7bc2e1d448f747f042c313b))
* comment out push trigger in tests.yml for clarity ([e518f24](https://github.com/AndreyTodorov/invisatrack/commit/e518f2483fc4f62d97dec68ff5bb0e748c2c1a98))
* disable Save in SetEditModal when no fields have changed ([b8719d8](https://github.com/AndreyTodorov/invisatrack/commit/b8719d8118453310cafc65b1b041678a8c25b1c1))
* exclude future-dated sets from pickCurrent picker in SetEditModal ([b9a2169](https://github.com/AndreyTodorov/invisatrack/commit/b9a2169f9b6b4d69131f17b495a73002d31c63bb))
* hide avg wear on home when current set has no sessions ([429b4e0](https://github.com/AndreyTodorov/invisatrack/commit/429b4e0be5f5ba6243fc1cd2d1908b3a675cb5ab))
* initialize profileInitRef with default values for goal settings ([c165fe7](https://github.com/AndreyTodorov/invisatrack/commit/c165fe73589fb3fb64d38fb22adf2782c93fd62c))
* mark several dependencies as dev dependencies in package-lock.json ([789caec](https://github.com/AndreyTodorov/invisatrack/commit/789caec37d08d6db3287e446ecfdf12a52c818bf))
* normalize legacy ISO timestamps in set date fields ([147d12c](https://github.com/AndreyTodorov/invisatrack/commit/147d12c2105277bddc5294e42f0926931aeb61e5))
* only advance current set when new set starts today or earlier ([6546112](https://github.com/AndreyTodorov/invisatrack/commit/6546112046aa4098aac8a408ec36d03d8b2859b3))
* only show Current badge when set start date is today or earlier ([876f403](https://github.com/AndreyTodorov/invisatrack/commit/876f403f1cc249a9ecf272cd9cbc918316f50bd6))
* PWA icons, Firebase rules currentSetStartDate validation, deploy.yml environment name ([39dee44](https://github.com/AndreyTodorov/invisatrack/commit/39dee44a850490b0b803254f5d185aeec17c7f47))
* remove unused hookTreatment destructure in SetEditModal ([08fd983](https://github.com/AndreyTodorov/invisatrack/commit/08fd983e38efa5b595e2b429646eb948d549c53f))
* remove unused secondaryBtn variable in SettingsView ([1ca3ca2](https://github.com/AndreyTodorov/invisatrack/commit/1ca3ca219460971d385bae1b4484ef2cb23b8d75))
* reorder import statements in index.css for consistency ([f3e8be0](https://github.com/AndreyTodorov/invisatrack/commit/f3e8be01bea58d012f749450880606c52e209232))
* resolve timer bugs and add live budget countdown ([8760709](https://github.com/AndreyTodorov/invisatrack/commit/8760709cef4ae622e947b21924e5957532a05834))
* round average removals value in StatsGrid component ([b7ccde6](https://github.com/AndreyTodorov/invisatrack/commit/b7ccde6fece3bff2ebe03d64a00484f1b2fd590e))
* show dash for avg wear with no data and preserve endDate when duration cleared ([d610ceb](https://github.com/AndreyTodorov/invisatrack/commit/d610ceb7bc6833b3095fc16e9a6a8906457e5565))
* skip pre-push main branch check in CI environments ([db248a2](https://github.com/AndreyTodorov/invisatrack/commit/db248a24d9a84bcc846cbcb80fc60573cf1b3ccd))
* TypeScript type-only imports and test setup for verbatimModuleSyntax ([ef5f09b](https://github.com/AndreyTodorov/invisatrack/commit/ef5f09b17aadf61b814c86ad3aa82113c6f136af))
* update date formatting in WearChart and filter stats in ReportsView ([0691ed2](https://github.com/AndreyTodorov/invisatrack/commit/0691ed2f2c6eabbc0e5920b35707c954977a746f))
* update deploy workflow for GitHub Pages with improved structure and naming ([94634b3](https://github.com/AndreyTodorov/invisatrack/commit/94634b39e86c9645c1821d17239de60379799f04))
* update Node.js version to 22 in CI workflows ([d7064f6](https://github.com/AndreyTodorov/invisatrack/commit/d7064f6b6d0dbaac0ccfe4a63716eaf8dde32ca3))
* update notification icon path to /invisatrack/ base URL ([01f4754](https://github.com/AndreyTodorov/invisatrack/commit/01f4754b0f59c59c620e6dedad665820e6b4b374))
* use date-based adjacent set lookup and clean up error display ([24aa9a0](https://github.com/AndreyTodorov/invisatrack/commit/24aa9a00c0dc05d551ce0b0546c4137e6e34231c))


### Features

* add .npmrc to enable legacy peer dependencies ([6362414](https://github.com/AndreyTodorov/invisatrack/commit/6362414a33f9654990e28c5cca854d443cd6d835))
* add contexts and base hooks (CR-2 offline merge, CR-4 stale closure fix) ([497aeab](https://github.com/AndreyTodorov/invisatrack/commit/497aeab8dfdc60ded1ae9f7ae0ff9e67cf854708))
* add core hooks (CR-1 no-require, CR-3 dup-session guard, LG-6 cap-ref, LG-7 set-validation, CR-6 streak) ([f2ef16c](https://github.com/AndreyTodorov/invisatrack/commit/f2ef16c45bf34f1255c31ece9d45787df8692c2d))
* add custom tooth + aligner SVG favicon for InvisaTrack ([78d0c3e](https://github.com/AndreyTodorov/invisatrack/commit/78d0c3eabb03a72296327a9b0106eb8a0475da0f))
* add delete set flow to SetEditModal ([2c4be05](https://github.com/AndreyTodorov/invisatrack/commit/2c4be05e1ca0b2105591a2e895b007d2b7b3116a))
* add deleteSet to useSets hook ([7a3f3d6](https://github.com/AndreyTodorov/invisatrack/commit/7a3f3d62ae350cfb9d6bf63d0a0e12b8ca06fee0))
* add editable set number field to SetEditModal ([92425f7](https://github.com/AndreyTodorov/invisatrack/commit/92425f76ae3b9e741bf461b6ae2c987486aeb223))
* add Firebase configuration and emulator support in the project ([7c81296](https://github.com/AndreyTodorov/invisatrack/commit/7c81296f4b4a7110bb25a9611e890d8fd4e97b41))
* add services (firebase, db with dead-letter, syncManager CR-7 fix, notifications) ([28090cd](https://github.com/AndreyTodorov/invisatrack/commit/28090cdbf668efb74888b0e7320a93fca09269c8))
* add Sets tab to History with set editing ([98f445e](https://github.com/AndreyTodorov/invisatrack/commit/98f445e857d1179fd1f6c50041a08ed216add53f))
* add start date field and click-outside dismiss to StartNewSetModal ([26a678d](https://github.com/AndreyTodorov/invisatrack/commit/26a678dac755769fa8fb02d1dce6c5298cc3751b))
* add testing capabilities with vitest and implement tests for hooks ([74ad9a1](https://github.com/AndreyTodorov/invisatrack/commit/74ad9a178dc0aab7584e2af9d11487c3b1d31540))
* add utility functions with tests (time, stats, sessionValidation, csv, deviceId) ([9353daa](https://github.com/AndreyTodorov/invisatrack/commit/9353daad17551a51461d5c55cdf87252bd9db0bb))
* add wear ring, session summary card, and UI polish ([506895e](https://github.com/AndreyTodorov/invisatrack/commit/506895ea79406828e503c58f763b532443549ff2))
* allow updateSet to update setNumber ([78018d3](https://github.com/AndreyTodorov/invisatrack/commit/78018d3dcc0824ad54b36010e0ddf66ccf2d79cb))
* app shell, routing, login, onboarding views (LG-5 first-run fix) ([e2c4864](https://github.com/AndreyTodorov/invisatrack/commit/e2c4864658c1e5faafc30880290753e628b1c888))
* auto-adjust adjacent set dates when editing a set ([711d2fa](https://github.com/AndreyTodorov/invisatrack/commit/711d2fac876dda158d980d7e656c75439f143d6d))
* bug fixes, reports improvements, and click-outside-to-close modals ([b137632](https://github.com/AndreyTodorov/invisatrack/commit/b13763265247080820d25678394fff5adc0efeac))
* disable Cancel button when no dirty fields in edit modals ([02278c3](https://github.com/AndreyTodorov/invisatrack/commit/02278c3fdcd37848fdab65b91eb720594b14b17f))
* enhance SessionEditModal with initial time setup and conditional save button ([f79cb8f](https://github.com/AndreyTodorov/invisatrack/commit/f79cb8f769fe2302cf2b2d6ec69d9937438ae21c))
* enhance SettingsView with improved save button and validation for user preferences ([9718799](https://github.com/AndreyTodorov/invisatrack/commit/97187995d0edd455fb3d5ba420f8c9017d571acc))
* generate PWA icons from InvisaTrack SVG favicon ([7442826](https://github.com/AndreyTodorov/invisatrack/commit/74428269350e27bfe608b394d7799f093b02bb3e))
* History/Reports/Settings views (LG-1 local dates, LG-2 dynamic goal, OS-4 tz, SF-2 confirm) ([66bbea6](https://github.com/AndreyTodorov/invisatrack/commit/66bbea62d7438bbf930c1d49833d9d626d947905))
* implement date-based set ownership with auto-advance ([6b4ac09](https://github.com/AndreyTodorov/invisatrack/commit/6b4ac09ed8a53d37b7e06a15137efe4ad32cd5f3))
* implement InvisaTrack rebrand with updated app name and custom favicon ([96defbe](https://github.com/AndreyTodorov/invisatrack/commit/96defbee22873bfe7662b8d3e46ba5851fea99de))
* move Start New Set from Settings to History Sets tab ([8d106fc](https://github.com/AndreyTodorov/invisatrack/commit/8d106fcf8c25d0953b349bddeb880be23ef7d18e))
* PWA icons, Firebase validation rules, GitHub Actions CI, and test infrastructure ([cd4af32](https://github.com/AndreyTodorov/invisatrack/commit/cd4af32b42e3c05d1863d43d70004b23e52f81c8))
* rename app to InvisaTrack across all source files ([43941c9](https://github.com/AndreyTodorov/invisatrack/commit/43941c9e843d4a7f30b1f1e5d8bed8c74ade3f10))
* timer/dashboard/HomeView (CR-5 tz-edit, LG-1 local-date, LG-3 newline, LG-4 fmt, SF-2 confirm) ([d496d24](https://github.com/AndreyTodorov/invisatrack/commit/d496d24958ffed5bd8cdecfdf1aa88374762ce48))
* UX depth improvements across settings, home, history, and reports ([37449f2](https://github.com/AndreyTodorov/invisatrack/commit/37449f27d712ac36cfa9f2f3617ffcd2d4c0340a))
