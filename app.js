const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const localStrategy = require("passport-local");

const bcrypt = require('bcrypt');
const saltRounds = 10;


const {User,Courses,Chapters,Pages,Enrollments,pageCompletion} = require('./models');
app.set("view engine","ejs");

app.use(cookieParser('shh! some secret thing'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
  secret:"my-super-secret-key-21728176152478952",
  resave: false,
  saveUninitialized: false,
  cookie:{
    maxAge:24*60*60*1000
  }
}))

app.use(bodyParser.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
};

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(request, response, next) {
    response.locals.messages = request.flash();
    next();
});

const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');


//loaclStratergy

passport.use('local', new localStrategy(
  { usernameField: 'email' },
   function(email, password, done) {
    User.findOne({where:{ email: email }}).then(async(user)=>{
      if (!user) {
        return done(null, false, { message: 'User with given email not found,sign up first.' });
      }
      const match = await bcrypt.compare(password,user.password)
      if(!match){
        return done(null, false, { message: 'Incorrect  password.' });
      }
      if(user.role==='educator'){
        return done(null,user,{role:"educator"});
      }
      if(user.role==='student'){
        return done(null,user,{role:"student"});
      }
      else{
        return done(null, user,{message: 'User role not recognized.'});
      }
    }).catch((err)=>{
        return done(err);
      });
    },
  ),
);




//passport serializing and deserializing

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(new Error("User not found"), null);
      }
    })
    .catch((error) => {
      done(error, null);
    });
});


app.get("/", (request, response) => {
    if(request.isAuthenticated()){
      if(request.user.role==='educator'){
        return response.redirect("/educator_dashboard");
      }
      if(request.user.role==='student'){
       return response.redirect("/student_dashboard");
      }
    }

    return response.render("index", 
        { title: "Home Page" ,
          name:"",
          dashboard:'',
        csrfToken:request.csrfToken()
        });
})

app.get("/login",(request,response)=>{
  response.render("login",{title:"Login",name:"",dashboard:'',csrfToken:request.csrfToken()});
});

app.get("/signup",(request,response)=>{
  response.render("signup",{title:"Sign Up",name:"",dashboard:'',csrfToken:request.csrfToken()})
});

app.post("/users",async(request,response)=>{
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  try{
    const user = await User.create({
      role:request.body.role,
      firstName:request.body.firstName,
      lastName:request.body.lastName,
      email:request.body.email,
      password:hashedPassword
    });
    request.login(user,(error)=>{
      if(error){
        console.log(error);
      }
      if(user.role === 'educator'){
        response.redirect('/educator_dashboard');
      }
      else if(user.role === 'student'){
        response.redirect('/student_dashboard');
      }
      else{
      response.redirect('/signup');
      }
    })
  }catch(err){
    console.log(err);
    return response.status(500).send("Signup failed");
  }
})


app.post("/session",
  passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true
  }),(req,res)=>{
    if(req.user.role==='educator'){
      return res.redirect("/educator_dashboard");
    }
    if(req.user.role==='student'){
      return res.redirect('/student_dashboard');
    }
    else{
      return res.redirect('/login');
    }
});



function ensureEducator(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'educator') {
    return next();
  }
  return res.status(403).send('Access Denied');
}
function ensureStudent(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'student') {
    return next();
  }
  return res.status(403).send('Access Denied');
}




app.get("/educator_dashboard",
  ensureEducator,async(req,res)=>{
  try{
        const courses = await Courses.findAll({
        where: { userId: req.user.id }
      });
      
    console.log("Fetched courses:", courses); 
    res.render('educator_dashboard',{
      csrfToken:req.csrfToken(),
      title:'educator',
      name:req.user.firstName + " " + req.user.lastName,
      dashboard:'-Educator Dashboard',
      courses: courses
    });
  }catch(err){
    console.log(err);
  }
});
// app.get("/student_dashboard",connectEnsureLogin.ensureLoggedIn(),async(req,res)=>{
//   try{
//     const courses = await Courses.findAll(
//       {
//       include: [{
//         model: User,
//         attributes: ['firstName', 'lastName'], // Only educator name
//       }],
//     }
//     );
//     res.render('student_dashboard',{
//       csrfToken:req.csrfToken(),
//       title:'student',
//       name:req.user.firstName + " " + req.user.lastName,
//       dashboard:'-Student Dashboard',
//       courses: courses,
//       enrolls:'hello'
//     });
//   }catch(err){
//     console.log(err);
//   }
// });


app.get('/student_dashboard', ensureStudent,async (req, res) => {
  try {
    // Get enrolled courses
    const student = await User.findByPk(req.user.id, {
      include: [{
        model: Courses,
        as: 'EnrolledCourses',
        include: [{ model: User, attributes: ['firstName', 'lastName'] }] // educator
      }]
    });

    // Get all available courses (for preview), excluding already enrolled
    const enrolledCourseIds = student.EnrolledCourses.map(c => c.id);

    const otherCourses = await Courses.findAll({
      where: {
        id: { [Op.notIn]: enrolledCourseIds }
      },
      include: [{ model: User, attributes: ['firstName', 'lastName'] }]
    });

    res.render('student_dashboard', {

      csrfToken:req.csrfToken(),
      title:'student',
      name:req.user.firstName + " " + req.user.lastName,
      dashboard:'-Student Dashboard',
      enrolledCourses: student.EnrolledCourses,
      otherCourses,
      enrolledCourseIds
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});




app.get('/educator_dashboard/create_course', ensureEducator, (req, res) => {
  try{
    res.render('create_course',{
      csrfToken:req.csrfToken(),
      title:'create_course',
      name:req.user.firstName + " " + req.user.lastName,
      dashboard:'-Create Course'

    });
  }catch(err){
    console.log(err);
  }
});

app.post('/educator_dashboard/create_course', ensureEducator, async (req, res) => {
  try{
      console.log("BODY:", req.body);
      await Courses.create({
      courseName: req.body.course_name,
      courseDescription: req.body.course_description,
      userId: req.user.id
    });
    res.redirect('/educator_dashboard');
  }catch(err){
    // console.log("BODY:", req.body);
    console.log(err);
  }
})

app.get("/signout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });
});


app.get('/educator_dashboard/view_report', ensureEducator, async (req, res) => {
  try {
    const educatorId = req.user.id;
    const reports = await Courses.findAll({
      where: { userId: educatorId },
      attributes: [
        'id',
        'courseName',
        [Sequelize.fn('COUNT', Sequelize.col('CourseEnrollments.id')), 'studentCount']
      ],
      include: [
        {
          model: Enrollments,
          as: 'CourseEnrollments',
          attributes: []
        }
      ],
      group: ['Courses.id'],
      raw: true
    });

    res.render('educator_dashboard_reports', {
      title: 'Course Reports',
      dashboard:'Reports',
      name: req.user.firstName + ' ' + req.user.lastName,
      reports,
      csrfToken: req.csrfToken()
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating report");
  }
});


app.get(`/educator_dashboard/:courseId/chapter/new`, ensureEducator, (req, res) => {
  try {
    res.render('new_chapter', {
      csrfToken: req.csrfToken(),
      title: 'New Chapter',
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-New Chapter',
      courseId: req.params.courseId
    });
  } catch (err) {
    console.log(err);
  }
});

app.post(`/educator_dashboard/:courseId/chapter/new`, ensureEducator, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    await Chapters.create({
      chapterName: req.body.chapter_name,
      chapterDescription: req.body.chapter_description,
      courseId: req.params.courseId
    });
    res.redirect(`/educator_dashboard/${req.params.courseId}`);
  } catch (err) {
    // console.log("BODY:", req.body);
    console.log(err);
  }
})
app.get('/educator_dashboard/:courseId', ensureEducator, async (req, res) => {
  try {
    const chapters = await Chapters.findAll({
      where: { courseId: req.params.courseId }
    });
    res.render('educator_dashboard_chapters', {
      csrfToken: req.csrfToken(),
      title: 'Course Chapters',
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-Course Chapters',
      chapters: chapters,
      courseId:req.params.courseId
    });
  } catch (err) {
    console.log(err);
  }
});

app.post(`/educator_dashboard/:courseId/:chapterId/pages/new`,ensureEducator, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    await Pages.create({
      pageTitle: req.body.page_title,
      pageCotent: req.body.page_content, //typo error content in db table.
      chapterId: req.params.chapterId
    });
    res.redirect(`/educator_dashboard/${req.params.courseId}/${req.params.chapterId}/pages`);
  } catch (err) {
    // console.log("BODY:", req.body);
    console.log(err);
  }
});

app.get(`/educator_dashboard/:courseId/:chapterId/page/new`, ensureEducator, (req, res) => {
  try {
    res.render('create_pages', {
      csrfToken: req.csrfToken(),
      title: 'Chapter Pages',
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-Chapter Pages',
      chapterId: req.params.chapterId,
      courseId:req.params.courseId
    });
  } catch (err) {
    console.log(err);
  }
});
app.get(`/educator_dashboard/:courseId/:chapterId/pages`, ensureEducator, async (req, res) => {
  try {
    const {courseId, chapterId} = req.params;
    const pages = await Pages.findAll({
      where: { chapterId: chapterId },
      order: [['id', 'ASC']],
    });

    res.render('educator_dashboard_pages', {
      csrfToken: req.csrfToken(),
      title: 'Chapter Pages',
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-Chapter Pages',
      pages: pages,
      courseId: courseId,
      chapterId
      

    });
  } catch (err) {
    console.log(err);
  }
});


app.get('/educator_dashboard/:courseId/:chapterId/pages/page/:pageId/edit', ensureEducator, async (req, res) => {
  const { courseId,chapterId,pageId } = req.params;

  const page = await Pages.findByPk(pageId);
  if (!page) return res.status(404).send("Page not found");

  res.render('edit_page', {
    csrfToken: req.csrfToken(),
    title: 'Edit Page',
    page,
    name: req.user.firstName + " " + req.user.lastName,
    dashboard: '-Edit Page',
    chapterId: chapterId,
    courseId: courseId
  });
});

app.get("/student_dashboard/:courseId/preview", ensureStudent, async (req, res) => {
  try {
    const chapters = await Chapters.findAll({
      where: { courseId: req.params.courseId }
    });
    res.render('student_dashboard_preview', {
      csrfToken: req.csrfToken(),
      title: 'Course Preview',
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-Course Preview',
      chapters: chapters
    });
  } catch (err) {
    console.log(err);
  }
});

app.post('/student_dashboard/courses/:courseId/enroll', ensureStudent, async (req, res) => {
  const studentId = req.user.id;
  const courseId = req.params.courseId;

  try {
    // Check if already enrolled
    const existing = await Enrollments.findOne({
      where: { studentId, courseId }
    });

    if (!existing) {
      await Enrollments.create({ studentId, courseId });
      req.flash("success", "Successfully enrolled!");
    } else {
      req.flash("info", "Already enrolled in this course.");
    }

    res.redirect('/student_dashboard');
  } catch (err) {
    console.error("Enrollment Error:", err);
    res.status(500).send("Enrollment failed");
  }
});

app.get("/course/:courseId/chapters", ensureStudent, async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  try {
    // Check if user is enrolled
    const enrolled = await Enrollments.findOne({
      where: { courseId, studentId }
    });

    if (!enrolled) {
      return res.status(403).send("Access denied. You are not enrolled in this course.");
    }

    // Fetch course and chapters
    const course = await Courses.findByPk(courseId, {
      include: [
        { model: Chapters, order: [["order", "ASC"]] },
        { model: User, attributes: ["firstName", "lastName"] }, // Educator
      ]
    });

    if (!course) {
      return res.status(404).send("Course not found");
    }

    // Get all page completions by this student for this course
const completions = await pageCompletion.findAll({
  where: { userId: studentId },
  attributes: ['pageId'],
  raw: true,
});

// Convert to Set for fast lookup
const completedPageIds = new Set(completions.map(c => c.pageId));

// For each chapter, fetch its pages and compute progress
const chapterProgress = await Promise.all(
  course.Chapters.map(async (chapter) => {
    const pages = await Pages.findAll({ where: { chapterId: chapter.id } });
    const total = pages.length;
    const completed = pages.filter(p => completedPageIds.has(p.id)).length;
    return {
      chapterId: chapter.id,
      totalPages: total,
      completedPages: completed,
      completionPercentage: total ? Math.round((completed / total) * 100) : 0
    };
  })
);

    res.render("student_course_chapters", {
      csrfToken: req.csrfToken(),
      course,
      chapters: course.Chapters,
      educator: course.User,
      name: req.user.firstName + " " + req.user.lastName,
      title: 'Chapters',
      dashboard: '-Chapters',
      chapterProgress
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/course/:courseId/chapter/:chapterId/page/:pageIndex',ensureStudent, async (req, res) => {
  const { courseId, chapterId, pageIndex } = req.params;
  const userId = req.user.id;

  try {
    // Ensure the user is enrolled
    const enrollment = await Enrollments.findOne({ where: { studentId: userId, courseId } });
    if (!enrollment) return res.status(403).send("Access Denied");

    // Fetch chapter + pages
    const chapter = await Chapters.findByPk(chapterId, {
      include: [{ model: Pages, separate: true,order: [['id', 'ASC']] }]
    });

    if (!chapter || !chapter.Pages || chapter.Pages.length === 0)
      return res.status(404).send("No pages found");

    const pages = chapter.Pages;
    const index = parseInt(pageIndex);

    if (index < 0 || index >= pages.length)
      return res.status(400).send("Invalid page index");

    const currentPage = pages[index];

    // Check if this page is marked complete
    const isCompleted = await pageCompletion.findOne({
      where: { userId, pageId: currentPage.id }
    });

    res.render('student_page_view', {
      csrfToken: req.csrfToken(),
      title:'Page View',
      pageTitle: currentPage.pageTitle,
      pageContent: currentPage.pageCotent,
      currentIndex: index,
      chapterId,
      courseId,
      totalPages: pages.length,
      pageId: currentPage.id,
      isCompleted: !!isCompleted,
      name: req.user.firstName + " " + req.user.lastName,
      dashboard: '-pages',
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/course/:courseId/chapter/:chapterId/page/:pageId/complete', ensureStudent,async (req, res) => {
  const { pageId ,courseId, chapterId} = req.params;
  const userId = req.user.id;
  const pageIndex = req.query.pageIndex || 0;

  try {
    const [record, created] = await pageCompletion.findOrCreate({
      where: { userId, pageId }
    });

    res.redirect(`/course/${courseId}/chapter/${chapterId}/page/${pageIndex}`); // stay on same page
  } catch (err) {
    console.error(err);
    res.status(500).send("Error marking as complete");
  }
});


app.post('/educator_dashboard/:courseId/:chapterId/pages/page/:pageId/edit', ensureEducator, async (req, res) => {
  const { courseId, chapterId, pageId } = req.params;
  const { pageTitle, pageCotent } = req.body;

  try {
    const page = await Pages.findByPk(pageId);
    if (!page) return res.status(404).send("Page not found");

    await page.update({ pageTitle, pageCotent });

    // Get the chapter to extract courseId
    const chapter = await Chapters.findByPk(page.chapterId);
    if (!chapter) return res.status(404).send("Chapter not found");

    res.redirect(`/educator_dashboard/${courseId}/${chapterId}/pages`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating page");
  }
});

app.get('/educator_dashboard/change_password', ensureEducator, (req, res) => {
  res.render('educator_change_password', {
    csrfToken: req.csrfToken(),
    name: req.user.firstName + ' ' + req.user.lastName,
    title: 'Change Password',
    dashboard: '-Change Password'
  });
});
app.get('/student_dashboard/change_password', ensureStudent, (req, res) => {
  res.render('student_change_password', {
    csrfToken: req.csrfToken(),
    name: req.user.firstName + ' ' + req.user.lastName,
    title: 'Change Password',
    dashboard: '-Change Password'
  });
});

app.post('/educator_dashboard/change_password',ensureEducator,async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).send("User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/educator_dashboard/change_password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/educator_dashboard/change_password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await user.update({ password: hashedPassword });

    req.flash('success', 'Password changed successfully');
    res.redirect('/signout');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});
app.post('/student_dashboard/change_password',ensureStudent,async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).send("User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/student_dashboard/change_password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/student_dashboard/change_password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await user.update({ password: hashedPassword });

    req.flash('success', 'Password changed successfully');
    res.redirect('/signout');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});



module.exports = app;
