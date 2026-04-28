using casestudy_api.DTOs;
using casestudy_api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace casestudy_api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthenticationController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly TokenService _tokenService;
        private readonly ILogger<AuthenticationController> _logger;

        public AuthenticationController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            TokenService tokenService,
            ILogger<AuthenticationController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            try
            {
                var existingUser = await _userManager.FindByEmailAsync(dto.Email);
                if (existingUser != null)
                    return BadRequest(new { message = "Email already in use." });

                var user = new ApplicationUser
                {
                    UserName = dto.Email,
                    Email = dto.Email,
                    FullName = dto.FullName
                };

                var result = await _userManager.CreateAsync(user, dto.Password);
                if (!result.Succeeded)
                    return BadRequest(result.Errors);

                var token = _tokenService.GenerateToken(user);
                return Ok(new AuthResponseDto { Token = token, Email = user.Email!, FullName = user.FullName! });

            }
            catch (Exception ex)
            {
                throw;
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(dto.Email);
                if (user == null)
                    return Unauthorized(new { message = "Invalid email or password." });

                var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: false);
                if (!result.Succeeded)
                    return Unauthorized(new { message = "Invalid email or password." });

                var token = _tokenService.GenerateToken(user);
                _logger.LogInformation("User {Email} logged in at {Time}", user.Email, DateTime.UtcNow);

                return Ok(new AuthResponseDto { Token = token, Email = user.Email!, FullName = user.FullName ?? "" });
            }
            catch (Exception ex)
            {

                throw;
            }
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                await _signInManager.SignOutAsync();
                _logger.LogInformation("User logged out at {Time}", DateTime.UtcNow);
                return Ok(new { message = "Logged out successfully." });
            }
            catch (Exception ex)
            {

                throw;
            }
        }
    }
}