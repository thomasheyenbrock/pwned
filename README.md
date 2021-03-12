# PWNED

This is an example website that demonstrated multiple security vulnerabilities in web applications running on Node.js and MongoDB.

## Running the app

The app is published as Docker conatiner. You can run it like so:

```sh
docker run --name pwned -p 3000:3000 -d thomasheyenbrock/pwned:latest
```

Once that's done you can access the app on [http://localhost:3000](http://localhost:3000).

There is a MongoDB running inside the conatiner. Note that restarting the container will clean all contents of the database and restore the default!

## Vulnerabilities

There are multiple vulnerabilities hidden in the application. Your goal is to capture all five flags (one for each vulnerability) hidden in the application. A flag is just a string starting with `flag_`.

For the start, play around with the app a bit without even looking at the source code. Deliberately try to break stuff. Here are some hints to get you started:

- Not all users are equal. Some have more rights than others.
- There are already some users and notes in the database, and not all of them are public.
- There's No SQL injection here (pun intended), since the app uses MongoDB.
- Searching can be quite expensive.
- What's the most popular place to store secrects in Node.js applications?
- But most of all, Samy is my hero.

If you are stuck, you can of course start looking at the code to find the vulnerable spots. But note that this version of the code has none of the flags in it, to not make it trivial for you to find their values. Apart from that, the code is exactly the one that's running in the Docker container.
