import express from "express";
import bodyParser from "body-parser";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import multer from "multer";
import path from "path";

const aboutContent1 = "Node.js allows developers to use JavaScript for writing command line tools and server-side scripting. Running Javascript on the server is commonly used to generate dynamic web page content before the page is sent to the user's web browser. Consequently, Node.js represents a 'JavaScript everywhere' paradigm, unifying web-application development around a single programming language, as opposed to using different languages for the server- versus client-side programming. Node.js has an event-driven architecture capable of asynchronous I/O. These design choices aim to optimize throughput and scalability in web applications with many input/output operations, as well as for real-time Web applications (e.g., real-time communication programs and browser games).";
const aboutContent2 = "Express.js is a minimal, flexible, and open-source backend web application framework for Node.js, designed to build web servers, web applications, and APIs. It acts as an abstraction layer on top of Node.js's raw HTTP tools, allowing you to manage backend logic using JavaScript with significantly fewer lines of code. Postgres, is a free and open-source relational database management system (RDBMS) emphasizing extensibility and SQL compliance. PostgreSQL features transactions with atomicity, consistency, isolation, durability (ACID) properties, automatically updatable views, materialized views, triggers, foreign keys, and stored procedures. It is supported on all major operating systems, including Windows, Linux, macOS, FreeBSD, and OpenBSD, and handles a range of workloads from single machines to data warehouses, data lakes, or web services with many concurrent users.";
const aboutContent3 = "The website is a blog about video game topics that are either retro or new. Members are allowed to put their experiences through blogs so others can learn from their experience. Enjoy reading.";

const app = express();
const port = 4006;
const saltRounds = 10;

env.config();

//all the specifications of our file is determined
//it will be related to our memory and our disk 
const storage = multer.diskStorage({
    //cb function determines where we are going to store it 
    //cb function will determine where we want to store those images 
    
    destination: (req, file, cb) => {

    //null - first arument is for any errors that might occur sending the images to a destination so we give it "null"
    //second argument is the destination
    cb(null, 'public/uploads/');
      //if we dont determine the specific filename that is different for every single file 
      //then it will initially store images on the folder on the name of their original file (same files same name)
      //differentiate the files is add the date and time in which the person uploaded the image to the file name 
      //date and filename combined
    }, filename: (req, file, cb) => {
      //file is a variable containing the actual file 
      //path.extname which means extend and grab the name of our file 
      //path.extname(file.originalname) --> original name of the file 
      console.log(file);
      const safeDate = new Date().toISOString().replace(/:/g, '-')
      cb(null, safeDate + path.extname(file.originalname));
  }
});

//this created the middleware 
const upload = multer({ storage:storage });

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.static("public")); // Serve front-end static files (HTML, CSS, JS) from a "public" folder
app.use('/public/uploads', express.static("./public/uploads")); // CRITICAL: Serve the "uploads" folder statically so HTML can read images

app.use(passport.initialize());
app.use(passport.session());


const db = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT
});

db.connect();

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render("home.ejs");
});


app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/dashboard", async (req, res) => {

    if(req.isAuthenticated()){

      const result1 = await db.query("SELECT * FROM posts");
      const result2 = await db.query("SELECT * FROM categories");
      const result3 = await db.query("SELECT * FROM admins");
      const result4 = await db.query("SELECT * FROM comments");

      res.render("dashboard.ejs", {
         posts: result1.rows || [],
         categories: result2.rows,
         admins: result3.rows,
         comments: result4.rows
      });
    }else{
      res.redirect("/login");
    }

    
});


app.get("/about", (req, res) => {

  if(req.isAuthenticated()){
    res.render("about.ejs", {
      aboutContent1: aboutContent1,
      aboutContent2: aboutContent2,
      aboutContent3: aboutContent3 
    });
  }else{
      res.redirect("/login");
  }  
});

/****************************  CATEGORIES  ********************************************************/  

app.get("/categories", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      const result = await db.query("SELECT * FROM categories");
      const title = result.rows;

      res.render("categories.ejs", { category: title});
    }catch(err){
      console.log("Error Displaying the Categories: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


app.post("/categories", async (req, res) => {
  const categorytitle = req.body.categorytitle;

  try{
    await db.query("INSERT INTO categories(categorytitle, datetime)VALUES($1, $2)", 
      [categorytitle, new Date().toLocaleString()]
    );
    res.redirect("/categories");

  }catch(err){
    console.log(`Error Adding New Category: `, err);
  }
});

app.get("/deletecategories/:categoryid", async (req, res) => {
  const categoryid = req.params.categoryid;

  try{
    await db.query("DELETE FROM categories WHERE categoryid = $1", [categoryid]);
    res.redirect("/categories");
  }catch(err){
    console.log("There is an error deleting category: ", err);
  }
});


app.get("/editcategories/:categoryid", async (req, res) => {
  const categoryid = req.params.categoryid;

  if(req.isAuthenticated()){
    try{
      const result = await db.query("SELECT * FROM categories WHERE categoryid = $1", [categoryid]);
      const category = result.rows[0];

      res.render("editcategories", { category: category });

    }catch(err){
      console.log("There is an error editing category: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


app.post("/editcategories", async (req, res) => {
  const categoryid = req.body.categoryid;
  const categorytitle = req.body.categorytitle;

  try{
    await db.query("UPDATE categories SET categorytitle = $1 WHERE categoryid = $2", [categorytitle, categoryid]);
    res.redirect("/categories");
  }catch(err){
    console.log("Error updating category: ", err);
  }
});


/***************************** END OF CATEGORIES *****************************************************/

/***************************** MY PROFILE ************************************************************/

app.get("/myprofile", async (req, res) => {
  if(req.isAuthenticated()){
    try{
      const result = await db.query("SELECT * FROM admins WHERE adminid = $1", [req.user.adminid]);
      const admin = result.rows[0];
      res.render("myprofile", { admin:admin });

    }catch(err){
      console.log("Error going to profile: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


//upload one single file
//upload.single('image') --> name of the input when we grab the file 
app.post("/myprofile", upload.single('adminimage'), async (req, res) => {
    const adminid = req.body.adminid;
    const adminheadline = req.body.adminheadline;
    const adminbio = req.body.adminbio;
    

    /*
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image to upload.' });
    }
    */

    try{

      if(req.file){
        const adminimage = `${req.file.filename}`;
        await db.query("UPDATE admins SET adminheadline = $1, adminbio = $2, adminimage = $3 WHERE adminid = $4", 
        [adminheadline,adminbio,adminimage, adminid]);
      } else{
        await db.query("UPDATE admins SET adminheadline = $1, adminbio = $2 WHERE adminid = $3", 
        [adminheadline,adminbio, adminid]);
      }

      res.redirect("/dashboard");
    }catch(err){
      console.log("Error Updating My Profile: ", err);
      res.status(500).send("Server Error");
    }
});


app.get("/profile/:author", async (req, res) => {
  const author = req.params.author;

  try{
    const result = await db.query("SELECT * FROM admins WHERE adminname = $1", [author]);
    console.log(result);
    const admin = result.rows[0];
    res.render("profile", { admin:admin });
  }catch(err){
    console.log("Error Displaying Profile: ", err);
  }
});


/***************************** END OF MY PROFILE *****************************************************/

/*****************************  MY POSTS *************************************************************/

app.get("/posts", async (req, res) => {
  if(req.isAuthenticated()){
    try{

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const offset = (page - 1) * limit;

      const countResult = await db.query("SELECT * FROM posts");
      const items = countResult.rows;

      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit);

      const result = await db.query("SELECT * FROM posts ORDER BY postid ASC LIMIT $1 OFFSET $2", [limit, offset]);
      const post = result.rows;

      res.render("posts.ejs", { 
        post: post,
        posts: result.rows,
        currentPage: page,
        totalPages: totalPages,
        limit: limit 
        
      });
    }catch(err){
      console.log("Error Displaying Posts: ", err);
    }
  }else{
    res.redirect("/login");
  }
});

app.get("/addpost", async (req, res) => {

  if(req.isAuthenticated()){

    try{  
        const result = await db.query("SELECT * FROM categories");
        const category = result.rows;

        const result2 = await db.query("SELECT * FROM admins WHERE adminid = $1", [req.user.adminid]);
        const admin = result2.rows[0];

      res.render("addpost.ejs", { 
        category:category,
        admin:admin
      });
    }catch(err){
      console.log("Error Going To Add Post Page: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


app.post("/addpost", upload.single('image'), async (req, res) => {

  if(req.isAuthenticated()){

    const posttitle = req.body.posttitle;
    const postdescription = req.body.postdescription;
    const category = req.body.category;
    const author = req.body.author;
    const image = `${req.file.filename}`;
  
    try{
      await db.query(
      "INSERT INTO posts(posttitle,postdescription,category,author,image,datetime,admin_id)VALUES($1,$2,$3,$4,$5,$6,$7)",
      [posttitle,postdescription,category,author,image,new Date().toLocaleString(),req.user.adminid]);
      res.redirect("/posts");

    }catch(err){
      console.log("Error Adding Post: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


app.get("/deletepost/:postid", async (req, res) => {
  const postid = req.params.postid;

  try{
    await db.query("DELETE FROM posts WHERE postid = $1", [postid]);
    res.redirect("/posts");
  }catch(err){
    console.log("There is an error deleting category: ", err);
  }
});


app.get("/editpost/:postid", async (req, res) => {
  const postid = req.params.postid;

  if(req.isAuthenticated()){
    try{
      const result = await db.query("SELECT * FROM posts WHERE postid = $1", [postid]);
      const post = result.rows[0];

      const result2 = await db.query("SELECT * FROM categories");
      const category = result2.rows;

      res.render("editpost", { 
        post: post,
        category: category
       });

    }catch(err){
      console.log("There is an error editing post: ", err);
    }
  }else{
    res.redirect("/login");
  }
});


app.post("/editpost", upload.single('image'), async (req, res) => {
  const postid = req.body.postid;
  const posttitle = req.body.posttitle;
  const category = req.body.category;
  const postdescription = req.body.postdescription;
  

  try{

      if(req.file){
        const image = `${req.file.filename}`;
        await db.query("UPDATE posts SET posttitle = $1, image = $2, postdescription = $3 WHERE postid = $4", 
        [posttitle,image,postdescription,postid]);
      } else {
        await db.query("UPDATE posts SET posttitle = $1, postdescription = $2 WHERE postid = $3",
        [posttitle, postdescription, postid]);
      }

      
      res.redirect("/posts");
  }catch(err){
    console.log("There is an error updating post:",err);
  }
});

/*****************************  END OF MY POSTS ******************************************************/


/******************************** LIVE BLOG **********************************************************/

app.get("/blogs", async (req, res) => {

  try{

      // 1. Get query parameters, default to page 1, 10 items per page
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const offset = (page - 1) * limit;

      const countResult = await db.query("SELECT * FROM posts");
      const items = countResult.rows;

      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit);

      const result = await db.query("SELECT * FROM posts ORDER BY postid ASC LIMIT $1 OFFSET $2", [limit, offset]);
      const post = result.rows;

      res.render("blogs.ejs", { 
        post: post, 
        blogs: result.rows,
        currentPage: page,
        totalPages: totalPages,
        limit: limit
        
      });
  }catch(err){
      console.log("Error Displaying blogs: ", err);
  }
});


app.get("/blogs/:category", async (req, res) => {

  const category = req.params.category;

  // 1. Get query parameters, default to page 1, 10 items per page
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  const countResult = await db.query("SELECT * FROM posts");
  const items = countResult.rows;

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);

  try{
    const result = await db.query("SELECT * FROM posts WHERE category = $1", [category]);
    const post = result.rows;

    res.render("blogs", { 
      post: post, 
      blogs: result.rows,
      currentPage: page,
      totalPages: totalPages,
      limit: limit
    });
  }catch(err){
    console.log("Error displaying blogs based on categories: ", err);
  }
});


/****************************  THE SEARCH BUTTON  *******************************************************/ 

app.get("/search", async (req, res) => {
  const searchPost = req.query.searchItem;

  if (!searchPost || searchPost.trim() === '') {
      return res.redirect("/blogs");
  }

	try{

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const countResult = await db.query("SELECT * FROM posts");
    const items = countResult.rows;

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limit);

		const result = await db.query("SELECT * FROM posts WHERE LOWER(author) LIKE '%' || $1 || '%' OR LOWER(category) LIKE '%' || $1 || '%' OR LOWER(posttitle) LIKE '%' || $1 || '%' OR LOWER(postdescription) LIKE '%' || $1 || '%';", [searchPost.toLowerCase()]);
		console.log(result);
		const post = result.rows;

		res.render("search",{   
			post: post,
      blogs: result.rows,
      currentPage: page,
      totalPages: totalPages,
      limit: limit 
		});

	}catch(err){
		console.log("Search for your inquiry Failed: ", err);
	}

});


/*************************** END OF THE SEARCH BUTTON **************************************************/

app.get("/fullpost/:postid", async (req, res) => {
  const postid = req.params.postid;

  try{
      const result = await db.query("SELECT * FROM posts WHERE postid = $1", [postid]);
      const post = result.rows;
      console.log(result.rows[0].postid);

      const result2 = await db.query("SELECT * FROM comments WHERE post_id = $1 AND status = 'YES'", [postid]);
      const comments = result2.rows;

      const result3 = await db.query("SELECT * FROM admins WHERE adminname = $1", [req.user.adminname]);
      const admin = result3.rows[0];

      res.render("fullpost", { 
        post: post,
        comments: comments,
        admin: admin
       });
  }catch(err){
    console.log("Error Displaying Full Post: ", err);
  }
});

//add the comment 
app.post("/fullpost/:postid", async (req, res) => {

  const post_id = req.body.post_id;
  const name = req.body.name;
  const email = req.body.email;
  const comment = req.body.comment;

  try{
    await db.query("INSERT INTO comments(name,email,comment,post_id,status,approvedby,datetime)VALUES($1,$2,$3,$4,$5,$6,$7)",
      [name,email,comment,post_id,"NO","Pending",new Date().toLocaleString()]
    );
    res.redirect(req.get('referer') || '/');

  }catch(err){
    console.log("There is an error adding a comment: ", err);
  }
});


/**************************** END OF LIVE BLOG *******************************************************/

/**************************** MANAGE COMMENTS ********************************************************/

app.get("/comments", async (req, res) => {
    if(req.isAuthenticated()){
      try{
          const result1 = await db.query("SELECT * FROM comments WHERE status = 'NO'");
          const comment1 = result1.rows;

          const result2 = await db.query("SELECT * FROM comments WHERE status = 'YES'");
          const comment2 = result2.rows;

          res.render("comments.ejs", { 
            comment1:comment1, 
            comment2:comment2
          });
      }catch(err){
        console.log("There is an error dispalying comments: ", err);
      }
    
    }else{
      res.redirect("/login");
    }
});

//https://www.google.com/search?q=how+to+add+a+foreign+key+postid+posts+comments+post_id+postgresql+in+form+data&sca_esv=b5758367d36a4841&sxsrf=APpeQnuIjG4WI_kMNo5at665aiFYue2GkA%3A1783915029888&ei=FWJUapbmNcyz5NoPzbqYqAc&biw=1396&bih=639&ved=0ahUKEwjWxKmt4c6VAxXMGVkFHU0dBnUQ4dUDCBA&uact=5&oq=how+to+add+a+foreign+key+postid+posts+comments+post_id+postgresql+in+form+data&gs_lp=Egxnd3Mtd2l6LXNlcnAiTmhvdyB0byBhZGQgYSBmb3JlaWduIGtleSBwb3N0aWQgcG9zdHMgY29tbWVudHMgcG9zdF9pZCBwb3N0Z3Jlc3FsIGluIGZvcm0gZGF0YUiaI1DFDljTIHABeAGQAQCYAUCgAYkFqgECMTO4AQPIAQD4AQGYAgGgAgbCAgoQABhHGNYEGLADmAMAiAYBkAYIkgcBMaAH9hqyBwC4BwDCBwMyLTHIBwSACAE&sclient=gws-wiz-serp


app.get("/deletecomment/:commentid", async (req, res) => {
  const commentid = req.params.commentid;

  try{
    await db.query("DELETE FROM comments WHERE commentid = $1", [commentid]);
    res.redirect("/comments");
  }catch(err){
    console.log("There is an error deleting comment: ", err);
  }
});

//approve comment
app.get("/approvecomment/:commentid", async (req, res) => {

  const commentid = req.params.commentid;

  try{
    await db.query("UPDATE comments SET status = $1, approvedby = $2 WHERE commentid = $3", 
      ["YES", req.user.adminname, commentid]
    );
    res.redirect("/comments");
  }catch(err){
    console.log("There is an error approving your comment:", err);
  }
});

//dis-approve comment
app.get("/disapprovecomment/:commentid", async (req, res) => {

  const commentid = req.params.commentid;

  try{
    await db.query("UPDATE comments SET status = $1, approvedby = $2 WHERE commentid = $3", 
      ["NO", req.user.adminname, commentid]
    );
    res.redirect("/comments");
  }catch(err){
    console.log("There is an error approving your comment:", err);
  }
});

/************************  END OFMANAGE COMMENTS  ****************************************************/


/***************************** REGISTER AND LOGIN ****************************************************/


app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const adminName = req.body.adminName;

  try {
    const checkResult = await db.query("SELECT * FROM admins WHERE username = $1", [username]);

    if (checkResult.rows.length > 0) {
      res.send("Username already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          await db.query(
            "INSERT INTO admins (username, password, adminName, datetime) VALUES ($1, $2, $3, $4)",
            [username, hash, adminName, new Date().toLocaleString()]
          );

          const result1 = await db.query("SELECT * FROM posts");
          const result2 = await db.query("SELECT * FROM categories");
          const result3 = await db.query("SELECT * FROM admins");
          const result4 = await db.query("SELECT * FROM comments");

          res.render("dashboard.ejs", {
            posts: result1.rows || [],
            categories: result2.rows,
            admins: result3.rows,
            comments: result4.rows
          });
        }
      });
    }
  } catch (err) {
    console.log("This is the error: ", err);
  }
});


app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
  }));


passport.use("local", 
  new Strategy(async function verify(username, password, cb){
    try {
    const result = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      //verifying the password
      bcrypt.compare(password, storedHashedPassword, (err, valid) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return cb(err);
        } else {
          if (valid) {
            return cb(null, user);
          } else {
            return cb(null, false);
          }
        }
      });
    } else {
      return cb("User not found");
    }
  } catch (err) {
    console.log("There is a Login Error: ", err);
  }
  })
);


app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/***************************** END OF REGISTER AND LOGIN *********************************************/


passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
    console.log(`Server Running on port ${port}`);
});
