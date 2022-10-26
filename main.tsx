/** @jsx h */

import blog, { ga, redirects, h } from "blog";

blog({
  title: "dwj1210",
  description: "iOS | Android | Mobile Security",
  // header: <header>Your custom header</header>,
  // section: <section>Your custom section</section>,
  // footer: <footer>Your custom footer</footer>,
  avatar: "https://avatars.githubusercontent.com/u/24934234?v=4",
  avatarClass: "rounded-full",
  author: "dwj1210",
  links: [
    {title:"GitHub", url: "https://www.github.com/dwj1210"},
    {title:"Twitter", url: "https://twitter.com/dwj1210"},
  ],
  theme: "auto",
  // cover: "assets/images/cover_image.jpeg",
  showHeaderOnPostPage: true,
  // coverTextColor:"white",
  // middlewares: [

    // If you want to set up Google Analytics, paste your GA key here.
    // ga("UA-XXXXXXXX-X"),

    // If you want to provide some redirections, you can specify them here,
    // pathname specified in a key will redirect to pathname in the value.
    // redirects({
    //  "/hello_world.html": "/hello_world",
    // }),

  // ]
});
